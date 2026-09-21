import type {Node} from 'three/webgpu'

import {float, select, vec2} from 'three/tsl'

/**
 * Regular 2D hexagonal lattice coordinates.
 * Returns the cell center ID, local coordinate within the hexagon,
 * distance to the nearest hexagonal facet boundary, and radial distance to center.
 */
export function hexLattice(p: Node<'vec2'>) {
  const r = vec2(1.7320508, 1)
  const h = r.mul(0.5)
  const a = p.mod(r).sub(h)
  const b = p.sub(h).mod(r).sub(h)
  const isA = a.dot(a).lessThan(b.dot(b))
  const local = select(isA, a, b)
  const cellId = p.sub(local)
  const pAbs = local.abs()
  const edgeDist = float(0.5).sub(pAbs.x.mul(0.5).add(pAbs.y.mul(0.8660254)).max(pAbs.x))
  const radius = local.length()
  return {
    cellId,
    edgeDist,
    local,
    radius,
  }
}
