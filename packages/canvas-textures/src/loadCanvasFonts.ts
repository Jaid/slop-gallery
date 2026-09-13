import type {CanvasFont} from './types.ts'

/** Wait only for requested faces. Failed faces use Canvas2D's fallback, without a second raster. */
export default async function loadCanvasFonts(fonts: Iterable<CanvasFont>, onError: (error: unknown) => void = error => console.warn('Canvas font could not be loaded; using its fallback.', error)) {
  await Promise.all(Array.from(fonts, async ({font, text}) => {
    try {
      await document.fonts.load(font, text)
    } catch (error) {
      onError(error)
    }
  }))
}
