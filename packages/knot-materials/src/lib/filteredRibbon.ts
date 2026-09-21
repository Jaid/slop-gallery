import type {Node} from 'three/webgpu'

import {float} from 'three/tsl'

/**
 * Anti-aliased ribbon around the zero set of a scalar field, with distant-detail suppression when
 * the ribbon becomes thinner than a pixel.
 */
export function filteredRibbon(field: Node<'float'>, halfWidth: Node<'float'> | number) {
  const width = typeof halfWidth === 'number' ? float(halfWidth) : halfWidth
  const footprint = field.fwidth().max(0.00001)
  const profile = field.abs().smoothstep(width, width.add(footprint.mul(0.85))).oneMinus()
  return profile.mul(width.mul(2).div(footprint).min(1))
}
