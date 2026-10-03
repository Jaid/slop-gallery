import type {Node} from 'three/webgpu'

import {float} from 'three/tsl'

/** Hermite ramp from `from` (0) to `to` (1). Unlike the native smoothstep, the edges may be given in either order, so descending falloffs such as ramp(distance, 4, 1.5) are well-defined on every backend. */
export function ramp(x: Node<'float'>, from: Node<'float'> | number, to: Node<'float'> | number) {
  const start = typeof from === 'number' ? float(from) : from
  const span = (typeof to === 'number' ? float(to) : to).sub(start)
  const safeSpan = span.abs().max(1e-6).mul(span.lessThan(0).select(-1, 1))
  const t = x.sub(start).div(safeSpan).clamp()
  return t.mul(t).mul(t.mul(-2).add(3))
}
