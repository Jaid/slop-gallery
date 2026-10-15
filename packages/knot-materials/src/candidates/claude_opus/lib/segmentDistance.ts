import type {Node} from 'three/webgpu'

import {Fn, vec2} from 'three/tsl'

/**
 * Closest approach between a ray segment P + D·t (t ∈ [0, length]) and a line segment O + E·s (s ∈ [s0, s1]), for unit D and E.
 * Returns (distance, s) – s locates the closest point along the line, for tapering – so a thin 3D filament can be drawn analytically through a volume with exact parallax and no ray-marching steps.
 */
export const segmentDistance = Fn(([origin, direction, length, lineOrigin, lineDirection, s0, s1]: [Node<'vec3'>, Node<'vec3'>, Node<'float'>, Node<'vec3'>, Node<'vec3'>, Node<'float'>, Node<'float'>]) => {
  const w = origin.sub(lineOrigin)
  const b = direction.dot(lineDirection)
  const d = direction.dot(w)
  const e = lineDirection.dot(w)
  const denominator = b.mul(b).oneMinus().max(0.0001)
  const t0 = b.mul(e).sub(d).div(denominator).clamp(0, length)
  const s = lineDirection.dot(origin.add(direction.mul(t0)).sub(lineOrigin)).clamp(s0, s1)
  const t = direction.dot(lineOrigin.add(lineDirection.mul(s)).sub(origin)).clamp(0, length)
  return vec2(origin.add(direction.mul(t)).sub(lineOrigin.add(lineDirection.mul(s))).length(), s)
})
