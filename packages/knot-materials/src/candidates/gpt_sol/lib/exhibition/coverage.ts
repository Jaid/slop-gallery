import type {Node} from 'three/webgpu'

import {float, vec2} from 'three/tsl'

/** SDF coverage using the continuous domain’s footprint, never a fract()/floor() derivative. */
export function fill(distance: Node<'float'>, footprint: Node<'float'>) {
  const aa = footprint.max(0.00001)
  return distance.smoothstep(aa.negate(), aa).oneMinus()
}

export function stroke(distance: Node<'float'>, width: Node<'float'> | number, footprint: Node<'float'>) {
  const w = typeof width === 'number' ? float(width) : width
  const aa = footprint.max(0.00001)
  return distance.abs().smoothstep(w, w.add(aa)).oneMinus().mul(w.mul(2).div(aa).min(1))
}

export function roundedBox(p: Node<'vec2'>, x: number, y: number, radius: number) {
  const d = p.abs().sub(vec2(x - radius, y - radius))
  return d.max(0).length().add(d.x.max(d.y).min(0)).sub(radius)
}
