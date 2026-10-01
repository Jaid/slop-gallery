import type {Node} from 'three/webgpu'

import {float, select, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

/** Periodic 2D Voronoi with stable cell identity. `period` (whole cells per domain) makes the pattern seamless across the UV wrap. Distances are in cell units: `f1` nearest feature, `f2` second nearest, `edge` = f2 − f1. `id` is the wrapped lattice cell owning the nearest feature, `center` its position in the same coordinates as `position` (for per-cell radial effects) and `random` three stable random numbers for that owner. */
export function voronoi(position: Node<'vec2'>, period: readonly [number, number], seed = 0) {
  const cell = position.floor()
  const local = position.fract()
  const wrap = vec2(...period)
  let f1: Node<'float'> = float(9)
  let f2: Node<'float'> = float(9)
  let owner: Node<'vec2'> = vec2(0)
  let offset: Node<'vec2'> = vec2(0)
  for (let j = -1;j <= 1;j++) {
    for (let i = -1;i <= 1;i++) {
      const step = vec2(i, j)
      const id = wrapCell(cell.add(step), wrap)
      const jitter = cellNoiseVec3(vec3(id, seed))
      const toFeature = step.add(jitter.xy.mul(0.84).add(0.08)).sub(local)
      const distance = toFeature.length()
      const closer = distance.lessThan(f1)
      f2 = select(closer, f1, distance.min(f2))
      owner = select(closer, id, owner)
      offset = select(closer, toFeature, offset)
      f1 = distance.min(f1)
    }
  }
  return {
    f1,
    f2,
    edge: f2.sub(f1),
    id: owner,
    offset,
    random: cellNoiseVec3(vec3(owner, seed + 17.3)),
  }
}
