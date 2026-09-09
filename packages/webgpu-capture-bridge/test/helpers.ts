import type {FrameEncoder, RgbaFrame} from '../src/main.ts'
import type {WebGPURenderer} from 'three/webgpu'

import {PerspectiveCamera, RenderTarget, Scene, Vector2} from 'three/webgpu'

import {WebgpuCapture} from '../src/main.ts'

export class TestRenderer {
  autoClear = false
  backend = {isWebGPUBackend: true}
  capturedTarget: RenderTarget | null = null
  cubeFace = 3
  depth = true
  mipmapLevel = 2
  onRender = () => {}
  outputTarget: RenderTarget | null = new RenderTarget
  readback = () => Promise.resolve(new Uint8Array(this.size.width * this.size.height * 4).fill(255))
  readCount = 0
  samples = 4
  size = new Vector2(2, 2)
  stencil = false
  target: RenderTarget | null = new RenderTarget
  asRenderer() {
    return this as unknown as WebGPURenderer
  }
  getActiveCubeFace() {
    return this.cubeFace
  }

  getActiveMipmapLevel() {
    return this.mipmapLevel
  }
  getDrawingBufferSize(target: Vector2) {
    return target.copy(this.size)
  }
  getOutputRenderTarget() {
    return this.outputTarget
  }
  getRenderTarget() {
    return this.target
  }
  readRenderTargetPixelsAsync(target: RenderTarget, _x: number, _y: number, width: number, height: number) {
    if (target.width !== width || target.height !== height) {
      throw new Error('Readback dimensions do not match the target.')
    }
    this.readCount += 1
    this.capturedTarget = target
    return this.readback()
  }
  render() {
    this.onRender()
  }
  setOutputRenderTarget(target: RenderTarget | null) {
    this.outputTarget = target
  }
  setRenderTarget(target: RenderTarget | null, cubeFace = 0, mipmapLevel = 0) {
    this.target = target
    this.cubeFace = cubeFace
    this.mipmapLevel = mipmapLevel
  }
}

export const encode: FrameEncoder = ({width, height}: RgbaFrame) => `data:image/png;test,${width}x${height}`

/** Test-only adapter: deliberately small doubles do not broaden the published renderer API. */
export class TestCapture extends WebgpuCapture {
  constructor(options: {encode: FrameEncoder
    render: () => void
    renderer: TestRenderer}) {
    options.renderer.onRender = options.render
    super({
      renderer: options.renderer.asRenderer(),
      scene: new Scene,
      camera: new PerspectiveCamera,
      encode: options.encode,
    })
  }
}
