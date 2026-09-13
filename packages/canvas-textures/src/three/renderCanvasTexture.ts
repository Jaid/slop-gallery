import type {CanvasTextureRaster} from './types.ts'

import drawCanvas from './drawCanvas.ts'
import textureFromImage from './textureFromImage.ts'

/** Synchronous external-image texture. Its canvas is retained until texture disposal. */
export default function renderCanvasTexture(options: CanvasTextureRaster) {
  const surface = drawCanvas(options)
  return textureFromImage(surface.canvas, () => surface.dispose(), options)
}
