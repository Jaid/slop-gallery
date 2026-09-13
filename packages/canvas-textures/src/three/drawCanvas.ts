import type {CanvasRaster} from '../types.ts'

import CanvasSurface from '../CanvasSurface.ts'

export default function drawCanvas({width, height, draw}: CanvasRaster) {
  const surface = new CanvasSurface(width, height)
  try {
    draw(surface.context)
    if (surface.canvas.width !== width || surface.canvas.height !== height) {
      throw new Error('A canvas raster callback must not resize its surface.')
    }
    return surface
  } catch (error) {
    surface.dispose()
    throw error
  }
}
