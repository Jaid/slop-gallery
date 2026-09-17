import type {BufferGeometry, Material} from 'three/webgpu'

import {mrt, normalView, output, positionLocal, vec3} from 'three/tsl'
import {Color, HalfFloatType, Mesh, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, OrthographicCamera, RenderTarget, Scene, TorusKnotGeometry, WebGPURenderer} from 'three/webgpu'

import AsyncMaterials from '../../src/main.ts'

/** Detached rendering only; no input, navigation, page DOM or viewport changes. */
export default async function verifyProgressiveMaterials() {
  const geometry = new TorusKnotGeometry(0.6, 0.18, 128, 24)
  const material = new MeshPhysicalNodeMaterial({
    roughness: 0.3,
    metalness: 0.4,
  })
  material.name = 'async-material-test'
  material.emissiveNode = vec3(0.2, 0.6, 0.9).mul(positionLocal.x.sin().add(1))
  try {
    return await verifyMaterialCompilation(geometry, material)
  } finally {
    geometry.dispose()
    material.dispose()
  }
}

/** Caller retains ownership; also used by the gallery's expensive-material integration fixture. */
export async function verifyMaterialCompilation(geometry: BufferGeometry, material: Material) {
  const renderer = new WebGPURenderer({
    canvas: document.createElement('canvas'),
    antialias: false,
  })
  await renderer.init()
  const errors: Array<string> = []
  const backend = renderer.backend as typeof renderer.backend & {device: GPUDevice}
  backend.device.addEventListener('uncapturederror', event => errors.push(event.error.message))
  const descriptors: Array<{
    kind: string
    label: string
  }> = []
  let synchronousPipelines = 0
  let asynchronousPipelines = 0
  const createSync = backend.device.createRenderPipeline.bind(backend.device)
  const createAsync = backend.device.createRenderPipelineAsync.bind(backend.device)
  backend.device.createRenderPipeline = descriptor => {
    descriptors.push({
      kind: 'sync',
      label: descriptor.label ?? '',
    })
    synchronousPipelines++
    return createSync(descriptor)
  }
  backend.device.createRenderPipelineAsync = descriptor => {
    descriptors.push({
      kind: 'async',
      label: descriptor.label ?? '',
    })
    asynchronousPipelines++
    return createAsync(descriptor)
  }
  const scene = new Scene
  scene.background = new Color('#123456')
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 3
  const queue = new AsyncMaterials(renderer)
  const placeholder = new MeshStandardNodeMaterial({
    color: '#687078',
    roughness: 0.8,
  })
  const binding = queue.add(material)
  const reflectionCamera = camera.clone()
  const main = new RenderTarget(64, 64, {
    count: 2,
    type: HalfFloatType,
  })
  main.textures[0].name = 'output'
  main.textures[1].name = 'normal'
  const reflection = new RenderTarget(64, 64, {type: HalfFloatType})
  const outputs = mrt({
    output,
    normal: normalView,
  })
  const mesh = new Mesh(geometry, placeholder)
  mesh.onBeforeRender = binding.onBeforeRender
  binding.ref(mesh)
  scene.add(mesh)
  let frames = 0
  const render = () => {
    renderer.setRenderTarget(main)
    renderer.setMRT(outputs)
    renderer.render(scene, camera)
    renderer.setRenderTarget(reflection)
    renderer.setMRT(null)
    renderer.render(scene, reflectionCamera)
    renderer.setRenderTarget(null)
  }
  try {
    const started = performance.now()
    render()
    assert(mesh.material === placeholder, 'Full material leaked into ordinary rendering while warming.')
    const placeholderPixels = await renderer.readRenderTargetPixelsAsync(main, 0, 0, 64, 64)
    while (mesh.material === placeholder) {
      assert(performance.now() - started < 120_000, 'Material warmup timed out.')
      await new Promise(resolve => requestAnimationFrame(resolve))
      if (mesh.material !== placeholder) {
        break
      }
      render()
      frames++
    }
    const programs = renderer.info.memory.programs
    const callsBeforeActivation = descriptors.length
    render()
    const fullPixels = await renderer.readRenderTargetPixelsAsync(main, 0, 0, 64, 64)
    let changedPixels = 0
    for (let i = 0; i < fullPixels.length; i += 4) {
      if (fullPixels[i] !== placeholderPixels[i] || fullPixels[i + 1] !== placeholderPixels[i + 1] || fullPixels[i + 2] !== placeholderPixels[i + 2]) {
        changedPixels++
      }
    }
    assert(changedPixels > 100, 'The full material did not replace the placeholder pixels.')
    assert(renderer.info.memory.programs === programs, 'Activating the material compiled an unwarmed shader variant.')
    assert(!descriptors.slice(callsBeforeActivation).some(call => call.kind === 'sync' && call.label.startsWith(`renderPipeline_${material.name}_`)), `Activation synchronously compiled a full material variant: ${JSON.stringify(descriptors)}`)
    const fullMaterialPipelines = descriptors.filter(call => call.kind === 'async' && call.label.startsWith(`renderPipeline_${material.name}_`)).length
    assert(fullMaterialPipelines === 2, 'Both full-material contexts must use native asynchronous pipeline creation.')
    assert(errors.length === 0, errors.join('\n'))
    return {
      framesDuringWarmup: frames,
      elapsedMs: performance.now() - started,
      programs,
      changedPixels,
      synchronousPipelines,
      asynchronousPipelines,
      fullMaterialPipelines,
      errors,
    }
  } finally {
    await queue.disposeAsync()
    placeholder.dispose()
    main.dispose()
    reflection.dispose()
    await renderer.dispose()
  }
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message)
  }
}
