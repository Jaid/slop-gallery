export const knotPreviewWidth = 4.8
export const knotPreviewHeight = 3.2
export const knotPreviewTextureCellSize = 715
export const knotPreviewTextureWidth = knotPreviewTextureCellSize * 3
export const knotPreviewTextureHeight = knotPreviewTextureCellSize * 2
export const knotPreviewIconMaximumWidth = 0.925
export const knotPreviewIconMaximumHeight = 0.81
export const knotPreviewMountY = 1.5
export const knotPreviewBottomClearance = 0.125
export const knotPreviewPanelOffsetY = knotPreviewBottomClearance + knotPreviewHeight / 2 - knotPreviewMountY

export function knotPreviewTextureLayout(count: number) {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Knot preview count must be a non-negative integer.')
  }
  if (count === 0) {
    return {
      columns: 1,
      height: knotPreviewTextureHeight,
      rowCounts: [0],
      rowHeight: knotPreviewTextureHeight,
      rows: 1,
      tileWidth: knotPreviewTextureWidth,
      width: knotPreviewTextureWidth,
    }
  }
  let rows = 1
  let columns = count
  let score = Math.min(
    knotPreviewTextureWidth / columns * knotPreviewIconMaximumWidth,
    knotPreviewTextureHeight / rows * knotPreviewIconMaximumHeight,
  )
  let empty = 0
  for (let candidateRows = 2; candidateRows <= count; candidateRows++) {
    const candidateColumns = Math.ceil(count / candidateRows)
    const candidateScore = Math.min(
      knotPreviewTextureWidth / candidateColumns * knotPreviewIconMaximumWidth,
      knotPreviewTextureHeight / candidateRows * knotPreviewIconMaximumHeight,
    )
    const candidateEmpty = candidateRows * candidateColumns - count
    if (!(candidateScore > score || candidateScore === score && candidateEmpty < empty)) {
      continue
    }
    rows = candidateRows
    columns = candidateColumns
    score = candidateScore
    empty = candidateEmpty
  }
  const rowCounts = Array.from({length: rows}, () => columns)
  let missing = rows * columns - count
  while (missing > 0) {
    let band = Math.min(rows, missing)
    if (band % 2 !== rows % 2) {
      band--
    }
    if (band === 0) {
      rowCounts[Math.floor((rows - 1) / 2)]--
      missing--
      continue
    }
    const start = (rows - band) / 2
    for (let index = start; index < start + band; index++) {
      rowCounts[index]--
    }
    missing -= band
  }
  return {
    columns,
    height: knotPreviewTextureHeight,
    rowCounts,
    rowHeight: knotPreviewTextureHeight / rows,
    rows,
    tileWidth: knotPreviewTextureWidth / columns,
    width: knotPreviewTextureWidth,
  }
}
