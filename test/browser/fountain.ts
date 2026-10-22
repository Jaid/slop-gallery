import {time} from 'three/tsl'
import {AmbientLight, Color, DataUtils, DirectionalLight, HalfFloatType, Mesh, PerspectiveCamera, RenderTarget, Scene, WebGPURenderer} from 'three/webgpu'

import FountainGeometry from '../../src/lib/gallery/fountain/FountainGeometry.ts'
import FountainSpray from '../../src/lib/gallery/fountain/FountainSpray.ts'
import FountainBasinMaterial from '../../src/lib/materials/FountainBasinMaterial.ts'
import FountainStoneMaterial from '../../src/lib/materials/FountainStoneMaterial.ts'
import FountainWaterMaterial from '../../src/lib/materials/FountainWaterMaterial.ts'

/** Detached native WebGPU regression: actual fountain geometry/materials, including the transmission pass and GPU droplets. */
export default async function verifyFountain() {
  const renderer = new WebGPURenderer({canvas: document.createElement('canvas')})
  const target = new RenderTarget(512, 512, {type: HalfFloatType})
  const geometry = new FountainGeometry
  const stone = new FountainStoneMaterial
  const lining = new FountainBasinMaterial
  const spray = new FountainSpray
  const errors: Array<string> = []
  const results = []
  const savedUpdate = time.update.bind(time)
  try {
    await renderer.init()
    const {device} = renderer.backend as typeof renderer.backend & {device: GPUDevice}
    device.addEventListener('uncapturederror', event => errors.push(event.error.message))
    renderer.setRenderTarget(target)
    renderer.setClearColor(0, 0)
    const scene = new Scene
    scene.background = new Color('#384741')
    scene.add(new AmbientLight('#ffffff', 1.5))
    const sun = new DirectionalLight('#fff0d9', 3)
    sun.position.set(-3, 8, 2)
    scene.add(sun)
    scene.add(new Mesh(geometry.stone, stone), new Mesh(geometry.lining, lining), spray)
    const camera = new PerspectiveCamera(48, 1, 0.1, 50)
    const read = async (phase: number) => {
      time.onRenderUpdate(() => phase)
      renderer.render(scene, camera)
      const raw = await renderer.readRenderTargetPixelsAsync(target, 0, 0, 512, 512) as Uint16Array
      const pixels = Float32Array.from(raw, value => DataUtils.fromHalfFloat(value))
      assert(pixels.every(value => Number.isFinite(value) && value >= 0), 'Fountain produced invalid HDR pixels.')
      return pixels
    }
    const difference = (a: Float32Array, b: Float32Array) => {
      let sum = 0
      for (const [i, element] of a.entries()) {
        sum += Math.abs(element - b[i])
      }
      return sum / a.length
    }
    for (const heavy of [true, false, true]) {
      const pool = new FountainWaterMaterial(false, heavy)
      const falling = new FountainWaterMaterial(true, heavy)
      const pools = new Mesh(geometry.pools, pool)
      const spills = new Mesh(geometry.water, falling)
      scene.add(pools, spills)
      const views = []
      try {
        for (const position of [[3.8, 3.8, 3.8], [0, 1.2, 5.5], [0.1, 5, 0.1]] as const) {
          camera.position.set(position[0], position[1], position[2])
          camera.lookAt(0, 1.3, 0)
          const a = await read(0.3)
          const b = await read(1.1)
          const animatedDifference = difference(a, b)
          assert(animatedDifference > 0.00002, 'Fountain animation is frozen.')
          // Isolate the ripple normals: caustics and droplets alone must not make this check pass.
          const normal = pool.normalNode
          pool.normalNode = null
          pool.needsUpdate = true
          const flat = await read(1.1)
          pool.normalNode = normal
          pool.needsUpdate = true
          const normalDifference = difference(b, flat)
          assert(normalDifference > 0.00002, 'Procedural water normals have no visible effect.')
          views.push({
            position,
            animatedDifference,
            normalDifference,
          })
        }
        results.push({
          heavy,
          views,
        })
      } finally {
        scene.remove(pools, spills)
        pool.dispose()
        falling.dispose()
      }
    }
    await device.queue.onSubmittedWorkDone()
    assert(errors.length === 0, errors.join('\n'))
    return {
      results,
      errors,
    }
  } finally {
    time.update = savedUpdate
    renderer.setRenderTarget(null)
    geometry.dispose()
    stone.dispose()
    lining.dispose()
    spray.dispose()
    target.dispose()
    await renderer.dispose()
  }
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message)
  }
}
