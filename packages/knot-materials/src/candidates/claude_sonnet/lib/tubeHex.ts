import type {Node} from 'three/webgpu'

import {float, select, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {knotCircumference, knotLength} from './knotFrame.ts'

/** Nearest site of a hexagonal lattice on the knot’s (u, v) surface, as in a Rosensweig crown or a honeycomb. `cells[1]` must be even so the offset rows close around the tube, and both counts must be integers. `distance` is measured in object-space units so radii can be given in real sizes; `id` is a stable random triplet per site. */
export function tubeHex(tube: Node<'vec2'>, cells: readonly [number, number], seed = 0) {
  const [columns, rows] = cells
  const scaled = tube.mul(vec2(columns, rows))
  const size = vec2(knotLength / columns, knotCircumference / rows)
  const baseRow = scaled.y.floor()
  let nearest: Node<'float'> = float(9)
  let id: Node<'vec3'> = vec3(0)
  let offset: Node<'vec2'> = vec2(0)
  for (let dr = -1;dr <= 1;dr++) {
    const row = baseRow.add(dr)
    const shift = row.mod(2).mul(0.5)
    const baseColumn = scaled.x.sub(shift).floor()
    for (let dc = 0;dc <= 1;dc++) {
      const column = baseColumn.add(dc)
      const center = vec2(column.add(shift).add(0.5), row.add(0.5))
      const delta = scaled.sub(center).mul(size)
      const distance = delta.length()
      const closer = distance.lessThan(nearest)
      const wrapped = vec2(column.mod(columns).add(columns).mod(columns), row.mod(rows).add(rows).mod(rows))
      id = select(closer, cellNoiseVec3(vec3(wrapped, seed + 0.5)), id).toVar()
      offset = select(closer, delta, offset).toVar()
      nearest = nearest.min(distance).toVar()
    }
  }
  return {
    distance: nearest,
    id,
    offset,
  }
}
