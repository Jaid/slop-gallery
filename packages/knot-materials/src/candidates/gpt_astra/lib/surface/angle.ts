import type {Node} from 'three/webgpu'

import {atan} from 'three/tsl'

/**
 * The polar origin has no direction; define it as zero instead of relying on atan2(0, 0).
 */
export function polarAngle(q: Node<'vec2'>) {
  const origin = q.x.equal(0).and(q.y.equal(0))
  return atan(q.y, origin.select(1, q.x))
}
