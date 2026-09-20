export const knotPreviewMaximumColumns = 4
export const knotPreviewMaximumWidth = 4.8
export const knotPreviewMaximumHeight = 2.75
export const knotPreviewTextureCellSize = 715

export function knotPreviewTextureLayout(count: number) {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Knot preview count must be a non-negative integer.')
  }
  const columns = Math.min(knotPreviewMaximumColumns, Math.max(1, Math.ceil(Math.sqrt(count))))
  const rows = Math.max(1, Math.ceil(count / columns))
  return {
    columns,
    height: rows * knotPreviewTextureCellSize,
    rowHeight: knotPreviewTextureCellSize,
    rows,
    tileWidth: knotPreviewTextureCellSize,
    width: columns * knotPreviewTextureCellSize,
  }
}

export function knotPreviewGrid(count: number) {
  const texture = knotPreviewTextureLayout(count)
  const aspect = texture.width / texture.height
  const width = Math.min(knotPreviewMaximumWidth, knotPreviewMaximumHeight * aspect)
  const height = width / aspect
  return {
    columns: texture.columns,
    height,
    rowHeight: height / texture.rows,
    rows: texture.rows,
    tileWidth: width / texture.columns,
    width,
  }
}
