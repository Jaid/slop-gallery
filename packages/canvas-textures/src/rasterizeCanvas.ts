import type {CanvasRaster} from './types.ts'

import ReadbackCanvas from './ReadbackCanvas.ts'

/** One draw, one readback, and no retained canvas backing store, including on failure. */
export default function rasterizeCanvas({width, height, draw}: CanvasRaster) {
  const surface = new ReadbackCanvas(width, height)
  try {
    draw(surface.context)
    if (surface.canvas.width !== width || surface.canvas.height !== height) {
      throw new Error('A canvas raster callback must not resize its surface.')
    }
    return surface.read()
  } finally {
    surface.dispose()
  }
}
