export type CanvasSize = {
  height: number
  width: number
}

/** Tightly packed, unpremultiplied RGBA8 pixels in top-to-bottom canvas order. */
export type CanvasPixels = CanvasSize & {data: Uint8Array}

/** Draw synchronously; resolve fonts, images and other dependencies before calling. */
export type CanvasDraw = (context: CanvasRenderingContext2D) => void
export type CanvasRaster = CanvasSize & {draw: CanvasDraw}
export type CanvasFont = {font: string
  text?: string}
