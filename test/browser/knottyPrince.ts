import type {MaterialCompilation} from 'three-async-materials'
import type {MeshPhysicalNodeMaterial, NodeFrame} from 'three/webgpu'

import AsyncMaterials from 'three-async-materials'
import {AmbientLight, HalfFloatType, HemisphereLight, Mesh, MeshBasicNodeMaterial, PerspectiveCamera, RenderTarget, Scene, WebGPURenderer} from 'three/webgpu'

import createKnotMesh from '../../packages/knot-materials/src/createKnotMesh.ts'
import Prince from '../../packages/knot-materials/src/entries/knotty_prince/Material.ts'
import {createKnotGeometry} from '../../packages/knot-materials/src/geometry.ts'
import LayeredKnotBinding from '../../packages/knot-materials/src/LayeredKnotBinding.ts'
import StudioEnvironment from '../../packages/knot-materials/src/StudioEnvironment.ts'

/** Keep every opaque-core pixel covered while retaining shell-only fuzz. Uses the original sculpt and alpha mask. */
export default async function verifyKnottyPrince(samples = 4) {
  const renderer = new WebGPURenderer({
    canvas: document.createElement('canvas'),
    alpha: true,
  })
  const environment = new StudioEnvironment
  const geometry = createKnotGeometry()
  const material = new Prince(environment)
  const mesh = createKnotMesh(geometry, material)
  const core = mesh.children[0]
  const target = new RenderTarget(512, 512, {type: HalfFloatType})
  target.samples = samples
  const scene = new Scene
  scene.add(mesh, new AmbientLight('#ffffff', 0.45), new HemisphereLight('#e1edff', '#80705d', 1.3))
  const camera = new PerspectiveCamera(40, 1, 0.05, 100)
  const errors: Array<string> = []
  const results = []
  let originalGaps = 0
  let retainedFuzz = 0
  let queue: AsyncMaterials | undefined
  let layered: LayeredKnotBinding | undefined
  const placeholder = new MeshBasicNodeMaterial
  try {
    await renderer.init()
    const offline = renderer as WebGPURenderer & {
      _animation: {stop: () => void}
      _nodes: {nodeFrame: NodeFrame}
    }
    offline._animation.stop()
    const {device} = renderer.backend as typeof renderer.backend & {device: GPUDevice}
    device.addEventListener('uncapturederror', event => errors.push(event.error.message))
    renderer.setClearColor(0, 0)
    renderer.setRenderTarget(target)
    const read = async () => {
      renderer.render(scene, camera)
      const pixels = await renderer.readRenderTargetPixelsAsync(target, 0, 0, 512, 512) as Uint16Array
      assert(!pixels.some(value => (value & 0x7C_00) === 0x7C_00), 'Non-finite HDR pixels')
      return pixels
    }
    for (const seconds of [0.4, 0.94, 1.8]) {
      for (const distance of [1.7, 2.6]) {
        for (const angle of [0.3, 1.1, 2.2, 3.4]) {
          offline._nodes.nodeFrame.frameId++
          offline._nodes.nodeFrame.time = seconds
          camera.position.set(Math.sin(angle) * distance, 0.1, Math.cos(angle) * distance)
          camera.lookAt(0, 0, 0)
          // Original creator's outer mesh and mask, without a solid interior.
          core.visible = false
          const shell = await read()
          // Same topology, same anatomy, only the fuzz-thickness offset removed.
          mesh.material = material.coreMaterial!
          const solid = await read()
          mesh.material = material
          core.visible = true
          const complete = await read()
          let checked = 0
          let gaps = 0
          for (let i = 3; i < solid.length; i += 4) {
            if (solid[i]) {
              checked++
              if (!shell[i]) {
                originalGaps++
              }
              if (!complete[i]) {
                gaps++
              }
            } else if (complete[i]) {
              retainedFuzz++
            }
          }
          assert(checked > 1000, 'Empty solid-core render')
          assert(gaps === 0, `${gaps} core pixels remained see-through`)
          results.push({
            seconds,
            distance,
            angle,
            checked,
            gaps,
          })
        }
      }
    }
    await device.queue.onSubmittedWorkDone()
    assert(originalGaps > 100, 'Fixture did not reproduce the original slices')
    assert(retainedFuzz > 100, 'The frayed outer shell was lost')
    scene.remove(mesh)
    const warmMesh = new Mesh<typeof geometry, MeshBasicNodeMaterial | MeshPhysicalNodeMaterial>(geometry, placeholder)
    scene.add(warmMesh)
    const compilations: Array<MaterialCompilation> = []
    queue = new AsyncMaterials(renderer, {onSettled(result) {
      layered!.settled(result)
      compilations.push(result)
      if (compilations.length === 1) {
        assert(warmMesh.material === placeholder, 'Shell became visible before its core warmed')
      }
    }})
    layered = new LayeredKnotBinding(queue, material, material.coreMaterial!)
    layered.ref(warmMesh)
    warmMesh.onBeforeRender = layered.binding.onBeforeRender
    const deadline = performance.now() + 60_000
    while (compilations.length < 2 && performance.now() < deadline) {
      await read()
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    assert(compilations.length === 2 && compilations.every(result => result.status === 'ready' && result.contexts === 1), 'Layer pipelines failed or admitted synthetic contexts')
    assert(warmMesh.material === material, 'Shell did not activate')
    assert((warmMesh.children[0] as Mesh).material === material.coreMaterial, 'Core did not activate')
    assert(errors.length === 0, errors.join('\n'))
    return {
      results,
      originalGaps,
      retainedFuzz,
      warmedLayers: compilations.length,
      errors,
    }
  } finally {
    await queue?.disposeAsync()
    layered?.dispose()
    renderer.setRenderTarget(null)
    placeholder.dispose()
    material.dispose()
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
