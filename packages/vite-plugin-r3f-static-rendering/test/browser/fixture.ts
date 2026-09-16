import type {StaticPlan} from '../../src/plan.ts'
import type {CompiledScene} from '../../src/runtime.ts'

import * as Three from 'three/webgpu'

import {StaticSceneResources} from '../../src/runtime.ts'
import {bundleSignature} from '../../src/runtimeBundleGuard.ts'

export type Plans = {
  bundles: StaticPlan
  instances: StaticPlan
}

/** Detached rendering only: no navigation, focus, input, viewport changes or gallery-scene mutations. */
export default async function verify(plans: Plans) {
  const adapter = await navigator.gpu?.requestAdapter()
  if (!adapter) {
    throw new Error('No WebGPU adapter is available to run the native rendering regression.')
  }
  const renderer = new Three.WebGPURenderer({
    canvas: document.createElement('canvas'),
    antialias: false,
  })
  await renderer.init()
  const backend = renderer.backend as typeof renderer.backend & {
    device: GPUDevice
    isWebGPUBackend: boolean
  }
  if (!backend.isWebGPUBackend) {
    throw new Error('WebGL fallback cannot validate WebGPU bundles.')
  }
  const errors: Array<string> = []
  const error = (event: GPUUncapturedErrorEvent) => errors.push(event.error.message)
  backend.device.addEventListener('uncapturederror', error)
  const owned: Array<{dispose: () => void}> = []
  const target = new Three.RenderTarget(64, 64, {type: Three.UnsignedByteType})
  const secondTarget = new Three.RenderTarget(48, 48, {type: Three.UnsignedByteType})
  const camera = new Three.OrthographicCamera(-2, 2, 2, -2, 0.1, 20)
  camera.position.set(0, 0, 5)
  const scene = new Three.Scene
  scene.background = new Three.Color('#101010')
  scene.add(new Three.AmbientLight('#ffffff', 1.5))
  let frame = 0
  const render = async (object: Three.Object3D, target: Three.RenderTarget) => {
    scene.add(object)
    if (object instanceof StaticSceneResources) {
      object.updateBundles(bundleSignature(scene, renderer, ++frame))
    }
    renderer.setRenderTarget(target)
    renderer.setOutputRenderTarget(target)
    renderer.render(scene, camera)
    await backend.device.queue.onSubmittedWorkDone()
    const pixels = await renderer.readRenderTargetPixelsAsync(target, 0, 0, target.width, target.height)
    scene.remove(object)
    return new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength)
  }
  const baseline = (heterogeneous: boolean) => {
    const group = new Three.Group
    for (let index = 0; index < 4; index++) {
      const geometry = new Three.BoxGeometry(heterogeneous ? 0.35 + index * 0.1 : 0.6, 0.6, 0.6)
      const material = new Three.MeshStandardNodeMaterial({
        color: '#b88655',
        roughness: 0.75,
      })
      owned.push(geometry, material)
      const mesh = new Three.Mesh(geometry, material)
      mesh.position.set(index * 1.1, 0, 0)
      group.add(mesh)
    }
    return group
  }
  const compare = async (name: string, original: Three.Object3D, compiled: StaticSceneResources, target: Three.RenderTarget) => {
    const expected = await render(original, target)
    const actual = await render(compiled, target)
    const rowStride = Math.ceil(target.width * 4 / 256) * 256
    const colors = new Set<string>
    for (let y = 0; y < target.height; y++) {
      for (let x = 0; x < target.width; x++) {
        const offset = y * rowStride + x * 4
        colors.add(expected.subarray(offset, offset + 3).join(','))
      }
    }
    if (colors.size < 2) {
      throw new Error(`${name}: baseline did not render visible geometry.`)
    }
    let maximumDelta = 0
    let changedBytes = 0
    for (const [index, element] of expected.entries()) {
      const delta = Math.abs(element - actual[index])
      maximumDelta = Math.max(maximumDelta, delta)
      if (delta) {
        changedBytes++
      }
    }
    if (maximumDelta > 1) {
      throw new Error(`${name}: pixel mismatch, max channel delta ${maximumDelta}.`)
    }
    return {
      name,
      comparedBytes: expected.length,
      changedBytes,
      maximumDelta,
    }
  }
  try {
    const instances = new StaticSceneResources({
      plan: plans.instances,
      constructors: Three as unknown as CompiledScene['constructors'],
    })
    const bundles = new StaticSceneResources({
      plan: plans.bundles,
      constructors: Three as unknown as CompiledScene['constructors'],
    })
    owned.push(instances, bundles)
    const referenceInstances = baseline(false)
    const referenceBundles = baseline(true)
    const cases = [await compare('instancing', referenceInstances, instances, target), await compare('bundle initial view', referenceBundles, bundles, target)]
    camera.position.x = 2.5
    cases.push(await compare('bundle camera moved beyond initial frustum', referenceBundles, bundles, target))
    cases.push(await compare('bundle cached replay', referenceBundles, bundles, target))
    cases.push(await compare('bundle second target', referenceBundles, bundles, secondTarget))
    target.setSize(80, 48)
    cases.push(await compare('bundle resized target', referenceBundles, bundles, target))
    scene.add(new Three.PointLight('#ffbb77', 30, 10))
    cases.push(await compare('bundle light topology changed', referenceBundles, bundles, target))
    if (errors.length) {
      throw new Error(errors.join('\n'))
    }
    return {
      backend: 'WebGPU',
      adapter: {
        vendor: adapter.info.vendor,
        architecture: adapter.info.architecture,
        description: adapter.info.description,
      },
      cases,
      errors,
    }
  } finally {
    renderer.setRenderTarget(null)
    renderer.setOutputRenderTarget(null)
    backend.device.removeEventListener('uncapturederror', error)
    for (const resource of owned) {
      resource.dispose()
    }
    target.dispose()
    secondTarget.dispose()
    await renderer.dispose()
  }
}
