import type {Node} from 'three/webgpu'

import {float, select, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

/** Periodic 2D Voronoi: distances to the nearest two feature points, the wrapped identity of the nearest cell and the vector from the sample to its feature point. Distances are in lattice cells. `period` is the lattice size in cells (integers), so identities stay consistent across the UV seams. */
export function voronoi(p: Node<'vec2'>, period: [number, number], seed = 0, jitter = 0.9) {
  const size = vec2(...period)
  const base = p.floor()
  const local = p.sub(base)
  const bias = (1 - jitter) / 2
  let nearest: Node<'float'> = float(16)
  let second: Node<'float'> = float(16)
  let cell: Node<'vec2'> = vec2(0)
  let toPoint: Node<'vec2'> = vec2(0)
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const step = vec2(i, j)
      const wrapped = wrapCell(base.add(step), size)
      const random = cellNoiseVec3(vec3(wrapped, seed))
      const delta = step.add(random.xy.mul(jitter).add(bias)).sub(local)
      const distance = delta.dot(delta)
      const closer = distance.lessThan(nearest)
      second = select(closer, nearest, distance.min(second))
      nearest = select(closer, distance, nearest)
      cell = select(closer, wrapped, cell)
      toPoint = select(closer, delta, toPoint)
    }
  }
  return {
    f1: nearest.sqrt(),
    f2: second.sqrt(),
    cell,
    toPoint,
  }
}
