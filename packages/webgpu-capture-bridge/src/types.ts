import type {Camera, RenderPipeline, Scene, WebGPURenderer} from 'three/webgpu'

export type RgbaFrame = {
  height: number
  /** Tightly packed, top-to-bottom RGBA8 pixels. */
  pixels: Uint8ClampedArray<ArrayBuffer>
  width: number
}

export type CaptureFrameResult = {
  centerPixel: [number, number, number, number]
  dataUrl: string
  height: number
  /** Rec. 709 weighted RGB bytes, in the range 0–255; not linear-light luminance. */
  meanLuminance: number
  /** Fraction of pixels with at least one RGB channel greater than 8. Alpha is ignored. */
  nonBlackFraction: number
  width: number
}

export type CaptureFrame = () => Promise<CaptureFrameResult>

export type CaptureFrameApi = {
  captureFrame: CaptureFrame
}

export type FrameEncoder = (frame: RgbaFrame) => Promise<string> | string

export type WebgpuCaptureOptions = {
  camera: Camera
  /** Defaults to PNG encoding with a detached HTML canvas. */
  encode?: FrameEncoder
  pipeline?: RenderPipeline | null
  renderer: WebGPURenderer
  scene: Scene
}
