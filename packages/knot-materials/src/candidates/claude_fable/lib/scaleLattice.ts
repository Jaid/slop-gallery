import type {Node} from 'three/webgpu'

import {vec2} from 'three/tsl'

/**
 * Staggered lattice of overlapping unit discs – fish scales, seigaiha waves, roof tiles.
 *
 * Rows have pitch 1 along y and discs have pitch 2 along x, every other row shifted by 1. Discs of radius ≈ 1 therefore
 * cover the plane, and the disc from the higher row hides whatever lies beneath, so each disc shows its lower crescent.
 * Returns the covering disc's cell index (seam-safe when the lattice counts are integers), the offset from its center and
 * the distance to its center.
 */
export function scaleLattice(coord: Node<'vec2'>, radius = 1.02) {
  const row = coord.y.floor()
  const candidate = (rowIndex: Node<'float'>) => {
    const offset = rowIndex.mod(2)
    const column = coord.x.sub(offset).div(2).round()
    const center = vec2(column.mul(2).add(offset), rowIndex)
    const local = coord.sub(center)
    return {
      center,
      column,
      local,
      distance: local.length(),
    }
  }
  const above = candidate(row.add(1))
  const below = candidate(row)
  const useAbove = above.distance.lessThan(radius)
  const center = useAbove.select(above.center, below.center)
  const local = useAbove.select(above.local, below.local)
  const distance = useAbove.select(above.distance, below.distance)
  const rowIndex = useAbove.select(row.add(1), row)
  const column = useAbove.select(above.column, below.column)
  return {
    center,
    column,
    distance,
    local,
    row: rowIndex,
  }
}
