import type {Camera, RenderPipeline, Scene, WebGPURenderer} from 'three/webgpu'

export type RgbaFrame = {
  height: number
  /** Tightly packed, top-to-bottom RGBA8 pixels. */
  pixels: Uint8ClampedArray<ArrayBuffer>
  width: number
}

export type CaptureFrameResult = {
  centerPixel: [number, number, number, number]
  height: number
  /** The encoded frame, PNG with the default encoder. */
  image: Blob
  /** Rec. 709 weighted RGB bytes, in the range 0–255; not linear-light luminance. */
  meanLuminance: number
  /** Fraction of pixels with at least one RGB channel greater than 8. Alpha is ignored. */
  nonBlackFraction: number
  width: number
}

export type CaptureFrame = () => Promise<CaptureFrameResult>

export type CapturePixels = () => Promise<RgbaFrame>

export type CaptureFrameApi = {
  captureFrame: CaptureFrame
  capturePixels: CapturePixels
}

export type FrameEncoder = (frame: RgbaFrame) => Blob | Promise<Blob>

export type WebgpuCaptureOptions = {
  camera: Camera
  /** Defaults to PNG encoding with an OffscreenCanvas. */
  encode?: FrameEncoder
  pipeline?: RenderPipeline | null
  renderer: WebGPURenderer
  scene: Scene
}
