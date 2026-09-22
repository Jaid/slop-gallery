import type {Node} from 'three/webgpu'

import {float} from 'three/tsl'

/**
 * Signed-distance stroke. Supply derivatives of the unwrapped domain at lattice seams.
 */
export function stroke(distance: Node<'float'>, width: number, footprint: Node<'float'> = distance.fwidth()) {
  const aa = footprint.max(0.00001)
  return distance.abs().smoothstep(float(width).sub(aa.mul(0.5)), float(width).add(aa.mul(0.5))).oneMinus()
    .mul(float(width * 2).div(aa).min(1))
}

export function fill(distance: Node<'float'>, footprint: Node<'float'> = distance.fwidth()) {
  const aa = footprint.max(0.00001)
  return distance.smoothstep(aa.mul(-0.5), aa.mul(0.5)).oneMinus()
}

/**
 * Analytically box-filtered periodic line: even subpixel threads converge to their true area coverage.
 */
export function ruled(phase: Node<'float'>, halfWidth: number) {
  if (!(halfWidth > 0 && halfWidth < 0.5)) {
    throw new RangeError('Rule half-width must be between zero and 0.5.')
  }
  const footprint = phase.fwidth().max(0.0001)
  const integral = (x: Node<'float'>) => x.floor().mul(2 * halfWidth).add(x.fract().sub(0.5 - halfWidth).clamp(0, 2 * halfWidth))
  return integral(phase.add(footprint.mul(0.5))).sub(integral(phase.sub(footprint.mul(0.5)))).div(footprint).clamp()
}

/**
 * A sinusoidal profile that becomes its mean once its frequency exceeds the pixel footprint.
 */
export function wave(phase: Node<'float'>) {
  return phase.cos().mul(phase.fwidth().smoothstep(0.5, 3).oneMinus()).mul(0.5).add(0.5)
}

export function resolved(domain: Node<'vec2'> | Node<'vec3'>, start = 0.25, end = 0.9) {
  return domain.fwidth().length().smoothstep(start, end).oneMinus()
}
