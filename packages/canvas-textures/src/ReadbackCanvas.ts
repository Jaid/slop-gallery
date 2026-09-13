import type {CanvasPixels} from './types.ts'

export function validateCanvasSize(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || !Number.isSafeInteger(width * height * 4)) {
    throw new RangeError('Canvas dimensions must be positive integers with a safe RGBA byte length.')
  }
}

/** Owns context creation: readback hints cannot be applied to an existing context. */
export default class ReadbackCanvas {
  readonly canvas: HTMLCanvasElement
  readonly context: CanvasRenderingContext2D
  private disposed = false

  constructor(width: number, height: number) {
    validateCanvasSize(width, height)
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    const context = this.canvas.getContext('2d', {
      willReadFrequently: true,
      colorSpace: 'srgb',
    })
    if (!context) {
      this.dispose()
      throw new Error('Could not create a readback Canvas2D context.')
    }
    this.context = context
  }

  /** Releases browser backing storage, not the independently owned readback pixels. */
  dispose() {
    if (this.disposed) {
      return
    }
    this.disposed = true
    this.canvas.width = 0
    this.canvas.height = 0
  }

  /** getImageData already owns its pixels; retain its buffer without another copy. */
  read(): CanvasPixels {
    if (this.disposed) {
      throw new Error('Cannot read a disposed canvas.')
    }
    const {width, height} = this.canvas
    const {data} = this.context.getImageData(0, 0, width, height)
    return {
      width,
      height,
      data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    }
  }
}
