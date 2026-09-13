import type {CanvasTextureRaster} from './types.ts'

import rasterizeCanvas from '../rasterizeCanvas.ts'
import textureFromPixels from './textureFromPixels.ts'

/** Synchronous final raster. No placeholder buffer and no redundant pixel copy. */
export default function renderCanvasTexture(options: CanvasTextureRaster) {
  return textureFromPixels(rasterizeCanvas(options), options)
}
