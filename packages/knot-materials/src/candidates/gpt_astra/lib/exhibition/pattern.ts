import type {Node} from 'three/webgpu'

import {float, vec2} from 'three/tsl'

/** Coverage in pattern units. Supply an unwrapped footprint for repeated cells. */
export function fill(signedDistance: Node<'float'>, footprint: Node<'float'>) {
  const aa = footprint.max(0.00001)
  return signedDistance.smoothstep(aa.negate(), aa).oneMinus()
}

export function stroke(distance: Node<'float'>, halfWidth: number, footprint: Node<'float'>) {
  const radius = footprint.max(0.00001).mul(0.5)
  // Integrate a box-filtered interval. A subpixel line retains its area, not a spurious 50% core.
  const upper = distance.add(radius).min(halfWidth)
  const lower = distance.sub(radius).max(-halfWidth)
  return upper.sub(lower).max(0).div(radius.mul(2)).clamp()
}

/** Unresolved sinusoidal detail converges to its average instead of sparkling. */
export function wave(phase: Node<'float'>) {
  return phase.cos().mul(phase.fwidth().smoothstep(0.65, 3).oneMinus())
}

export function detail(coordinates: Node<'vec2'> | Node<'vec3'>) {
  return coordinates.fwidth().length().smoothstep(0.25, 0.85).oneMinus()
}

export function rotatePoint(point: Node<'vec2'>, angle: Node<'float'>) {
  const c = angle.cos()
  const s = angle.sin()
  return vec2(point.x.mul(c).sub(point.y.mul(s)), point.x.mul(s).add(point.y.mul(c)))
}

/** A bounded, smooth pulse, with no negative base passed to a fractional power. */
export function pulse(phase: Node<'float'>, power = 2) {
  return phase.sin().mul(0.5).add(0.5).clamp().pow(float(power))
}
