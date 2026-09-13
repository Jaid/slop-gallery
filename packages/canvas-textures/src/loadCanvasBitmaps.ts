export type CanvasBitmapLoadError = (source: string, error: unknown) => void

/** Decode URL images without creating GPU textures. Close the returned bitmaps after the final canvas draw. */
export default async function loadCanvasBitmaps(sources: Iterable<string>, signal?: AbortSignal, onError: CanvasBitmapLoadError = (source, error) => console.warn('Canvas image could not be loaded.', source, error)) {
  const bitmaps = new Map<string, ImageBitmap>
  await Promise.all([...new Set(sources)].map(async source => {
    if (signal?.aborted) {
      return
    }
    try {
      const response = await fetch(source, {signal})
      if (!response.ok) {
        throw new Error(`Canvas image HTTP ${response.status}: ${source}`)
      }
      const bitmap = await createImageBitmap(await response.blob())
      if (signal?.aborted) {
        bitmap.close()
        return
      }
      bitmaps.set(source, bitmap)
    } catch (error) {
      if (!signal?.aborted) {
        onError(source, error)
      }
    }
  }))
  return bitmaps
}

export function closeCanvasBitmaps(bitmaps: Iterable<ImageBitmap>) {
  for (const bitmap of bitmaps) {
    bitmap.close()
  }
}
