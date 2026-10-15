import type {Node} from 'three/webgpu'

import {vec2} from 'three/tsl'

/**
 * Pointy hexagons tiling a periodic plane: rows along `coord.x` at unit pitch, cells along `coord.y` at unit pitch, odd rows
 * shifted by half a cell. With an even row count and an integer cell count the tiling closes on both axes.
 * Returns the covering cell's center (lattice units), the offset from it and a hex distance that is 0.5 on the cell wall.
 */
export function hexLattice(coord: Node<'vec2'>) {
  const candidate = (rowParity: 0 | 1) => {
    const row = coord.x.sub(rowParity).div(2).round().mul(2).add(rowParity)
    const column = coord.y.sub(rowParity * 0.5).round().add(rowParity * 0.5)
    const center = vec2(row, column)
    const local = coord.sub(center)
    const distance = local.y.abs().max(local.x.abs().mul(0.75).add(local.y.abs().mul(0.5)))
    return {
      center,
      local,
      distance,
    }
  }
  const even = candidate(0)
  const odd = candidate(1)
  const useOdd = odd.distance.lessThan(even.distance)
  return {
    center: useOdd.select(odd.center, even.center),
    distance: useOdd.select(odd.distance, even.distance),
    local: useOdd.select(odd.local, even.local),
  }
}
