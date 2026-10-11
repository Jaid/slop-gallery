import type {CanvasRaster} from '../types.ts'

import CanvasSurface, {validateCanvasSize} from '../CanvasSurface.ts'

/** The scale transform stays on the context, so later partial redraws also use logical coordinates. */
export default function drawCanvas({width, height, resolution = 1, draw}: CanvasRaster) {
  if (!Number.isFinite(resolution) || resolution <= 0) {
    throw new RangeError('Canvas resolution must be a positive finite number.')
  }
  validateCanvasSize(width, height)
  const pixelWidth = Math.max(1, Math.round(width * resolution))
  const pixelHeight = Math.max(1, Math.round(height * resolution))
  const surface = new CanvasSurface(pixelWidth, pixelHeight)
  try {
    if (pixelWidth !== width || pixelHeight !== height) {
      surface.context.scale(pixelWidth / width, pixelHeight / height)
    }
    draw(surface.context)
    if (surface.canvas.width !== pixelWidth || surface.canvas.height !== pixelHeight) {
      throw new Error('A canvas raster callback must not resize its surface.')
    }
    return surface
  } catch (error) {
    surface.dispose()
    throw error
  }
}
