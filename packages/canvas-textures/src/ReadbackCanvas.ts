import type {CanvasPixels} from './types.ts'

import CanvasSurface from './CanvasSurface.ts'

/** A separate CPU-pixel surface whose first context request is readback-optimized. */
export default class ReadbackCanvas extends CanvasSurface {
  constructor(width: number, height: number) {
    super(width, height, true)
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
