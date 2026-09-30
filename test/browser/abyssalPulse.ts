import {vec3} from 'three/tsl'
import {DataUtils, HalfFloatType, Mesh, MeshBasicNodeMaterial, OrthographicCamera, PlaneGeometry, RenderTarget, Scene, WebGPURenderer} from 'three/webgpu'

import {cellNoiseVec3} from '../../packages/knot-materials/src/candidates/claude_fable/lib/cellNoiseVec3.ts'
import {tubeAspect, tubeLattice} from '../../packages/knot-materials/src/candidates/claude_fable/lib/tubeCoordinates.ts'
import AbyssalPulse from '../../packages/knot-materials/src/entries/abyssal_pulse/Material.ts'
import StudioEnvironment from '../../packages/knot-materials/src/StudioEnvironment.ts'

/** Checks real photophore cores against their own GPU-generated seeds, even where another feature is closer. */
export default async function verifyAbyssalPulse(Material = AbyssalPulse) {
  const width = 1024
  const height = 256
  const columns = Math.round(9 * tubeAspect)
  const rows = 9
  const renderer = new WebGPURenderer({canvas: document.createElement('canvas')})
  const target = new RenderTarget(width, height, {type: HalfFloatType})
  const environment = new StudioEnvironment
  const geometry = new PlaneGeometry(2, 2)
  const scene = new Scene
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 2
  const probe = new MeshBasicNodeMaterial
  const globals = globalThis as {KNOT_DEBUG_LAYER?: string}
  const previous = globals.KNOT_DEBUG_LAYER
  let material: AbyssalPulse
  try {
    globals.KNOT_DEBUG_LAYER = 'organDisc'
    material = new Material(environment)
  } finally {
    globals.KNOT_DEBUG_LAYER = previous
  }
  material.positionNode = null
  material.normalNode = null
  const mesh = new Mesh<PlaneGeometry, AbyssalPulse | MeshBasicNodeMaterial>(geometry, probe)
  scene.add(mesh)
  const errors: Array<string> = []
  try {
    await renderer.init()
    const {device} = renderer.backend as typeof renderer.backend & {device: GPUDevice}
    device.addEventListener('uncapturederror', event => errors.push(event.error.message))
    renderer.setRenderTarget(target)
    const read = async () => {
      renderer.render(scene, camera)
      const pixels = await renderer.readRenderTargetPixelsAsync(target, 0, 0, width, height) as Uint16Array
      return Float32Array.from(pixels, value => DataUtils.fromHalfFloat(value))
    }
    // Read UVs rather than assuming a backend-specific render-target row orientation.
    const {lattice, period} = tubeLattice(9)
    probe.colorNode = vec3(lattice.div(period), lattice.fwidth().length())
    const coordinates = await read()
    const cells = lattice.floor()
    probe.colorNode = cellNoiseVec3(vec3(cells, 4))
    probe.needsUpdate = true
    const features = await read()
    probe.colorNode = cellNoiseVec3(vec3(cells, 3))
    probe.needsUpdate = true
    const identities = await read()
    const seeds = new Map<string, {
      gate: number
      radius: number
      x: number
      y: number
    }>
    for (let i = 0; i < coordinates.length; i += 4) {
      const x = Math.floor(coordinates[i] * columns)
      const y = Math.floor(coordinates[i + 1] * rows)
      // Samples well within the cell avoid half-float UV rounding at the ownership boundary.
      const localX = coordinates[i] * columns - x
      const localY = coordinates[i + 1] * rows - y
      if (localX < 0.25 || localX > 0.75 || localY < 0.25 || localY > 0.75) {
        continue
      }
      const gate = Math.min(1, Math.max(0, (identities[i + 1] - 0.25) / 0.1))
      seeds.set(`${x}:${y}`, {
        x: features[i],
        y: features[i + 1],
        radius: identities[i] * 0.14 + 0.16,
        gate: gate * gate * (3 - 2 * gate),
      })
    }
    mesh.material = material
    const mask = await read()
    let checked = 0
    let crossCell = 0
    let clipped = 0
    for (let i = 0; i < coordinates.length; i += 4) {
      const x = coordinates[i] * columns
      const y = coordinates[i + 1] * rows
      const baseX = Math.floor(x)
      const baseY = Math.floor(y)
      const localX = x - baseX
      const localY = y - baseY
      for (let a = -1; a <= 1; a++) {
        for (let b = -1; b <= 1; b++) {
          const seed = seeds.get(`${(baseX + a + columns) % columns}:${(baseY + b + rows) % rows}`)!
          const distance = Math.hypot(a + seed.x - localX, b + seed.y - localY)
          // A generous margin absorbs half-float seed/UV quantization. These pixels must be fully covered.
          if (distance > seed.radius - coordinates[i + 2] - 0.03 || seed.gate < 0.99) {
            continue
          }
          checked++
          if (a || b) {
            crossCell++
          }
          if (!Number.isFinite(mask[i]) || mask[i] < 0.98) {
            clipped++
          }
        }
      }
    }
    await device.queue.onSubmittedWorkDone()
    assert(checked > 1000 && crossCell > 100, 'Insufficient organ-core or cross-cell coverage')
    assert(clipped === 0, `${clipped} fully covered photophore-core samples were cut off`)
    assert(errors.length === 0, errors.join('\n'))
    return {
      checked,
      crossCell,
      clipped,
      errors,
    }
  } finally {
    renderer.setRenderTarget(null)
    material.dispose()
    probe.dispose()
    geometry.dispose()
    environment.dispose()
    target.dispose()
    await renderer.dispose()
  }
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message)
  }
}
