import {mrt, normalView, output} from 'three/tsl'
import {BoxGeometry, Color, HalfFloatType, Mesh, MeshStandardNodeMaterial, OrthographicCamera, RenderTarget, Scene, WebGPURenderer} from 'three/webgpu'

import AsyncMaterials from '../../src/main.ts'

/** Detached WebGPU regression for live-target invalidation during async warmup. */
export default async function verifyLiveTargetLifetime() {
  const assert: (value: unknown, message: string) => asserts value = (value, message) => {
    if (!value) {
      throw new Error(message)
    }
  }
  const renderer = new WebGPURenderer({
    canvas: document.createElement('canvas'),
    antialias: false,
  })
  await renderer.init()
  const errors: Array<string> = []
  const backend = renderer.backend as typeof renderer.backend & {device: GPUDevice}
  backend.device.addEventListener('uncapturederror', event => errors.push(event.error.message))
  const geometry = new BoxGeometry(1, 1, 1)
  const placeholder = new MeshStandardNodeMaterial({color: '#687078'})
  const full = new MeshStandardNodeMaterial({
    color: '#d8894b',
    roughness: 0.37,
    metalness: 0.12,
  })
  full.name = 'async-target-lifetime-test'
  const scene = new Scene
  scene.background = new Color('#123456')
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 3
  const reflectionCamera = camera.clone()
  const main = new RenderTarget(16, 16, {
    count: 2,
    type: HalfFloatType,
  })
  main.textures[0].name = 'output'
  main.textures[1].name = 'normal'
  const reflection = new RenderTarget(16, 16, {type: HalfFloatType})
  const outputs = mrt({
    output,
    normal: normalView,
  })
  const queue = new AsyncMaterials(renderer)
  const binding = queue.add(full)
  const mesh = new Mesh(geometry, placeholder)
  mesh.onBeforeRender = binding.onBeforeRender
  binding.ref(mesh)
  scene.add(mesh)
  let invalidated = false
  let syncFullPipelines = 0
  let asyncFullPipelines = 0
  const createSync = backend.device.createRenderPipeline.bind(backend.device)
  const createAsync = backend.device.createRenderPipelineAsync.bind(backend.device)
  backend.device.createRenderPipeline = descriptor => {
    if (descriptor.label?.startsWith(`renderPipeline_${full.name}_`)) {
      syncFullPipelines++
    }
    return createSync(descriptor)
  }
  backend.device.createRenderPipelineAsync = descriptor => {
    if (descriptor.label?.startsWith(`renderPipeline_${full.name}_`)) {
      asyncFullPipelines++
      if (!invalidated) {
        invalidated = true
        // setSize() disposes the current GPU attachments. Warmup must be isolated from them.
        main.setSize(20, 20)
        reflection.setSize(20, 20)
      }
    }
    return createAsync(descriptor)
  }
  const renderObservedContexts = () => {
    renderer.setRenderTarget(main)
    renderer.setMRT(outputs)
    renderer.render(scene, camera)
    renderer.setRenderTarget(reflection)
    renderer.setMRT(null)
    renderer.render(scene, reflectionCamera)
    renderer.setRenderTarget(null)
    renderer.setMRT(null)
  }
  try {
    renderObservedContexts()
    const started = performance.now()
    while (mesh.material === placeholder) {
      assert(performance.now() - started < 30_000, 'Target-lifetime warmup timed out.')
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    assert(invalidated, 'The regression did not invalidate the original live targets.')
    // Rendering the now-active material must reuse the warmed variants.
    renderObservedContexts()
    await backend.device.queue.onSubmittedWorkDone()
    await new Promise(resolve => setTimeout(resolve, 0))
    assert(asyncFullPipelines === 2, `Expected exactly two async full-material pipelines, got ${asyncFullPipelines}.`)
    assert(syncFullPipelines === 0, `Activation created ${syncFullPipelines} synchronous full-material pipelines.`)
    assert(errors.length === 0, errors.join('\n'))
    return {
      elapsedMs: performance.now() - started,
      invalidated,
      asyncFullPipelines,
      syncFullPipelines,
      errors,
    }
  } finally {
    await queue.disposeAsync()
    geometry.dispose()
    placeholder.dispose()
    full.dispose()
    main.dispose()
    reflection.dispose()
    await renderer.dispose()
  }
}

