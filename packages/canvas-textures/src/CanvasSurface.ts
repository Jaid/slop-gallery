export function validateCanvasSize(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || !Number.isSafeInteger(width * height * 4)) {
    throw new RangeError('Canvas dimensions must be positive integers with a safe RGBA byte length.')
  }
}

/** Owns a Canvas2D backing store; GPU-only draws do not request readback optimization. */
export default class CanvasSurface {
  readonly canvas: HTMLCanvasElement
  readonly context: CanvasRenderingContext2D
  protected disposed = false

  constructor(width: number, height: number, willReadFrequently = false) {
    validateCanvasSize(width, height)
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    const context = this.canvas.getContext('2d', {
      willReadFrequently,
      colorSpace: 'srgb',
    })
    if (!context) {
      this.dispose()
      throw new Error('Could not create a Canvas2D context.')
    }
    this.context = context
  }

  dispose() {
    if (this.disposed) {
      return
    }
    this.disposed = true
    this.canvas.width = 0
    this.canvas.height = 0
  }
}
