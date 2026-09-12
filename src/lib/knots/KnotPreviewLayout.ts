export const knotPreviewColumns = 4
export const knotPreviewMinimumRows = 2
export const knotPreviewMaximumWidth = 4.8
export const knotPreviewMaximumHeight = 2.75
const sourceWidth = 1280
const sourceRowHeight = 366

export function knotPreviewGrid(count: number) {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Knot preview count must be a non-negative integer.')
  }
  const rows = Math.max(knotPreviewMinimumRows, Math.ceil(count / knotPreviewColumns))
  const aspect = sourceWidth / (rows * sourceRowHeight)
  const width = Math.min(knotPreviewMaximumWidth, knotPreviewMaximumHeight * aspect)
  const height = width / aspect
  return {
    columns: knotPreviewColumns,
    height,
    rowHeight: height / rows,
    rows,
    tileWidth: width / knotPreviewColumns,
    width,
  }
}

export function knotPreviewTile(count: number, index: number) {
  const grid = knotPreviewGrid(count)
  if (!Number.isSafeInteger(index) || index < 0 || index >= count) {
    throw new RangeError(`Invalid Knot preview index: ${index}`)
  }
  const column = index % grid.columns
  const row = Math.floor(index / grid.columns)
  return {
    ...grid,
    x: -grid.width / 2 + grid.tileWidth * (column + 0.5),
    y: grid.height / 2 - grid.rowHeight * (row + 0.5),
  }
}
