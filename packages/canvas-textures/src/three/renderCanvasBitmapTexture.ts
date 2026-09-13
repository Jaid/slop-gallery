import type {CanvasTextureRaster} from './types.ts'

import drawCanvas from './drawCanvas.ts'
import textureFromImage from './textureFromImage.ts'

/** Snapshot without CPU readback, releasing the canvas once the bitmap owns the image. */
export default async function renderCanvasBitmapTexture(options: CanvasTextureRaster) {
  const surface = drawCanvas(options)
  try {
    // WebGPU applies texture.flipY during the external-image copy, not during decoding.
    const bitmap = await createImageBitmap(surface.canvas, {
      imageOrientation: 'none',
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    })
    return textureFromImage(bitmap, () => bitmap.close(), options)
  } finally {
    surface.dispose()
  }
}
