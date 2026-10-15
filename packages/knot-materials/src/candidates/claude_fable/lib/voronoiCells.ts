import type {Node} from 'three/webgpu'

import {float, vec2} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

/**
 * Two-dimensional Voronoi partition with cell identity, for surface patterns that need per-patch randomness.
 * `period` wraps the lattice so patches survive the tube's UV seam. Returns the nearest feature's wrapped cell, its
 * jittered position in lattice units, the distance to it and the distance to the second-nearest feature.
 */
export function voronoi(coord: Node<'vec2'>, period: [number, number] | Node<'vec2'>, jitter = 1) {
  const periodNode = Array.isArray(period) ? vec2(...period) : period
  const base = coord.floor()
  const local = coord.fract()
  let nearest: Node<'float'> = float(8)
  let second: Node<'float'> = float(8)
  let id: Node<'vec2'> = vec2(0)
  let point: Node<'vec2'> = vec2(0)
  for (let y = -1;y <= 1;y++) {
    for (let x = -1;x <= 1;x++) {
      const offset = vec2(x, y)
      const cell = wrapCell(base.add(offset), periodNode)
      const random = cellNoiseVec3(cell).xy
      const feature = offset.add(random.sub(0.5).mul(jitter).add(0.5))
      const distance = feature.sub(local).length().toVar()
      const closer = distance.lessThan(nearest).toVar()
      second = closer.select(nearest, distance.min(second)).toVar()
      nearest = closer.select(distance, nearest).toVar()
      id = closer.select(cell, id).toVar()
      point = closer.select(feature.add(base), point).toVar()
    }
  }
  return {
    distance: nearest,
    id,
    point,
    second,
  }
}
