import type {Node} from 'three/webgpu'

import {float, vec3} from 'three/tsl'

import {wavelengthColor} from './wavelengthColorCie.ts'

/**
 * Color diffracted by a reflection grating, summed over its first `orders` orders.
 *
 * `shift` is the grating equation’s in-plane term (L + V)·g, with unit vectors toward light and viewer and the unit
 * grating vector g (perpendicular to the grooves). Order m shows the wavelength λ = spacing · |shift| / m, so a tilt or a
 * step sideways sweeps the reflection through the rainbow and on into the next order.
 */
export function gratingSpectrum(shift: Node<'float'>, spacing: Node<'float'> | number, orders = 3) {
  const pitch = typeof spacing === 'number' ? float(spacing) : spacing
  const magnitude = shift.abs()
  let sum: Node<'vec3'> = vec3(0)
  for (let order = 1;order <= orders;order++) {
    sum = sum.add(wavelengthColor(pitch.mul(magnitude).div(order)).mul(1 / Math.sqrt(order)))
  }
  return sum
}
