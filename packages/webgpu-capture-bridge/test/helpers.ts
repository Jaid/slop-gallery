import type {CaptureRenderer, FrameEncoder, RgbaFrame} from '../src/main.ts'

import {RenderTarget, Vector2} from 'three/webgpu'

export class TestRenderer implements CaptureRenderer {
  autoClear = false
  capturedTarget: RenderTarget | null = null
  cubeFace = 3
  depth = true
  mipmapLevel = 2
  outputTarget: RenderTarget | null = new RenderTarget
  readback = () => Promise.resolve(new Uint8Array(this.size.width * this.size.height * 4).fill(255))
  readCount = 0
  samples = 4
  size = new Vector2(2, 2)
  stencil = false
  target: RenderTarget | null = new RenderTarget

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
