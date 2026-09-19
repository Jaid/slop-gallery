import type {Node} from 'three/webgpu'

import {vec2} from 'three/tsl'

/** A rounded rectangular punch in a seamless 32 × 8 mechanical music-roll grid. */
export function brassPunch(tube: Node<'vec2'>) {
  const q = tube.mul(vec2(32, 8))
  const cell = q.floor().mod(vec2(32, 8))
  const local = q.fract().sub(0.5)
  // A deterministic four-column rhythm, with every fourth row retained as a structural rail.
  const open = cell.x.add(cell.y.mul(3)).mod(4).lessThan(3).and(cell.y.mod(4).lessThan(3))
  const corner = local.abs().sub(vec2(0.22, 0.26))
  const distance = corner.max(0).length().add(corner.x.max(corner.y).min(0)).sub(0.065)
  return {
    distance,
    open,
    q,
  }
}
