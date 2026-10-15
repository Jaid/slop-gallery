import type {Node} from 'three/webgpu'

import {float} from 'three/tsl'

/** Anti-aliased coverage of |x| < halfWidth on a unit-period lattice coordinate; once a period shrinks below a pixel it settles to its mean coverage instead of shimmering. */
export function filteredBox(x: Node<'float'>, halfWidth: Node<'float'> | number, footprint: Node<'float'>) {
  const width = typeof halfWidth === 'number' ? float(halfWidth) : halfWidth
  const aa = footprint.max(0.0001)
  const sharp = x.abs().smoothstep(width.sub(aa), width.add(aa)).oneMinus()
  return sharp.mix(width.mul(2).min(1), footprint.smoothstep(0.35, 0.9))
}
