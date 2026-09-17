export const knotPreviewColumns = 4
export const knotPreviewMinimumRows = 2
export const knotPreviewMaximumWidth = 4.8
export const knotPreviewMaximumHeight = 2.75
export const knotPreviewTextureWidth = 2500
export const knotPreviewTextureRowHeight = 715

export function knotPreviewTextureLayout(count: number) {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Knot preview count must be a non-negative integer.')
  }
  const rows = Math.max(knotPreviewMinimumRows, Math.ceil(count / knotPreviewColumns))
  return {
    columns: knotPreviewColumns,
    height: rows * knotPreviewTextureRowHeight,
    rowHeight: knotPreviewTextureRowHeight,
    rows,
    tileWidth: knotPreviewTextureWidth / knotPreviewColumns,
    width: knotPreviewTextureWidth,
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
