import type {Node} from 'three/webgpu'

import {float} from 'three/tsl'

/**
 * A zero-crossing ribbon filtered by its own screen footprint. Unresolved ribbons collapse toward zero instead of sparkling.
 */
export function screenRibbon(field: Node<'float'>, halfWidth: Node<'float'> | number) {
  const width = typeof halfWidth === 'number' ? float(halfWidth) : halfWidth
  const footprint = field.fwidth().max(0.00005)
  const core = field.abs().smoothstep(width.add(footprint.mul(1.25)), width.mul(0.35)).clamp()
  return core.mul(width.mul(2.4).div(footprint).min(1))
}
/**
 * Soft signed mask, 1 on the negative side, with a pixel-wide transition.
 */
export function screenFill(field: Node<'float'>) {
  const footprint = field.fwidth().max(0.00005)
  return field.smoothstep(footprint, footprint.negate()).clamp()
}
