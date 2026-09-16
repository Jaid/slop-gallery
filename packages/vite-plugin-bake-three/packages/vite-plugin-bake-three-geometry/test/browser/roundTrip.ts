import type {Constructors} from 'vite-plugin-bake-core/runtime'

import * as Three from 'three/webgpu'
import {decodeSnapshot} from 'vite-plugin-bake-core/runtime'

export type Fixtures = {
  canvas: string
  geometry: string
  texture: string
}
const pixels = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255])

/** Native GPU regression on a detached canvas. Does not touch the gallery scene or UI. */
export default async function verify(fixtures: Fixtures) {
  const adapter = await navigator.gpu?.requestAdapter()
  if (!adapter) {
    throw new Error('No native WebGPU adapter is available in this headless session.')
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
    throw new Error('This test requires native WebGPU.')
  }
  const errors: Array<string> = []
  const onError = (event: GPUUncapturedErrorEvent) => errors.push(event.error.message)
  backend.device.addEventListener('uncapturederror', onError)
  const target = new Three.RenderTarget(32, 32, {type: Three.UnsignedByteType})
  const scene = new Three.Scene
  const camera = new Three.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 2
  const resources: Array<{dispose: () => void}> = []
  const constructors = Three as unknown as Constructors
  const restore = (base64: string) => decodeSnapshot(Uint8Array.fromBase64(base64), constructors)()
  const render = async (geometry: Three.BufferGeometry, map?: Three.Texture) => {
    const material = new Three.MeshBasicNodeMaterial({
      color: '#ffffff',
      map: map ?? null,
      toneMapped: false,
    })
    resources.push(material)
    const mesh = new Three.Mesh(geometry, material)
    scene.add(mesh)
    renderer.setRenderTarget(target)
    renderer.render(scene, camera)
    await backend.device.queue.onSubmittedWorkDone()
    const data = await renderer.readRenderTargetPixelsAsync(target, 0, 0, 32, 32)
    scene.remove(mesh)
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }
  const compare = (name: string, actual: Uint8Array, expected: Uint8Array) => {
    if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
      throw new Error(`${name}: native GPU output differs after baking.`)
    }
    if (!actual.some(value => value !== 0)) {
      throw new Error(`${name}: empty rendering.`)
    }
    return {
      name,
      comparedBytes: actual.byteLength,
      equal: true,
    }
  }
  try {
    const original = new Three.TorusKnotGeometry(0.45, 0.13, 48, 12).rotateY(0.2)
    original.computeTangents()
    original.computeBoundingBox()
    const baked = restore(fixtures.geometry) as Three.BufferGeometry
    resources.push(original, baked)
    const geometryResult = compare('geometry', await render(baked), await render(original))
    const plane = new Three.PlaneGeometry(1.6, 1.6)
    const texture = new Three.DataTexture(pixels, 2, 2)
    texture.colorSpace = Three.SRGBColorSpace
    texture.flipY = true
    texture.needsUpdate = true
    const bakedTexture = restore(fixtures.texture) as Three.DataTexture
    resources.push(plane, texture, bakedTexture)
    const pixelResult = compare('data texture', await render(plane, bakedTexture), await render(plane, texture))
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 16
    const context = canvas.getContext('2d')!
    context.fillStyle = '#734129'
    context.fillRect(0, 0, 16, 16)
    context.fillStyle = '#e0b040'
    context.fillRect(2, 3, 5, 7)
    const canvasTexture = new Three.Texture(canvas)
    canvasTexture.colorSpace = Three.SRGBColorSpace
    canvasTexture.generateMipmaps = false
    canvasTexture.minFilter = Three.LinearFilter
    canvasTexture.magFilter = Three.LinearFilter
    canvasTexture.needsUpdate = true
    const bakedCanvas = restore(fixtures.canvas) as Three.Texture<HTMLCanvasElement>
    resources.push(canvasTexture, bakedCanvas)
    const canvasResult = compare('canvas texture', await render(plane, bakedCanvas), await render(plane, canvasTexture))
    bakedCanvas.dispose()
    if (bakedCanvas.image.width !== 0 || canvas.width !== 16) {
      throw new Error('Canvas ownership was not isolated.')
    }
    await backend.device.queue.onSubmittedWorkDone()
    if (errors.length) {
      throw new Error(errors.join('\n'))
    }
    return {
      backend: 'WebGPU',
      cases: [geometryResult, pixelResult, canvasResult],
      errors,
    }
  } finally {
    renderer.setRenderTarget(null)
    backend.device.removeEventListener('uncapturederror', onError)
    for (const resource of resources) {
      resource.dispose()
    }
    target.dispose()
    await renderer.dispose()
  }
}
