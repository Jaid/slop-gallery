/** Tight pixel bounds, retaining even partially transparent antialiased edges. */
export function visibleBounds({data, width, height}: Pick<ImageData, 'data' | 'height' | 'width'>) {
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) {
        continue
      }
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  return right < left ? undefined : [left, top, right - left + 1, bottom - top + 1] as const
}

export function previewTileRect(width: number, height: number, size: number, padding = 12) {
  const scale = (size - padding * 2) / Math.max(width, height)
  const w = width * scale
  const h = height * scale
  return [(size - w) / 2, (size - h) / 2, w, h] as const
}
