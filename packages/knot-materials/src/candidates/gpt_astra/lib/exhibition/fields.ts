import type {Node} from 'three/webgpu'

import {atan, vec2} from 'three/tsl'

/** A footprint-aware mask. Differentiation must precede any coordinate wrapping. */
export function coverage(distance: Node<'float'>, footprint: Node<'float'>) {
  const aa = footprint.max(0.00001)
  return distance.smoothstep(aa.negate(), aa).oneMinus()
}

export function stroke(distance: Node<'float'>, width: number, footprint: Node<'float'>) {
  return coverage(distance.abs().sub(width), footprint)
}

export function segment(p: Node<'vec2'>, a: Node<'vec2'>, b: Node<'vec2'>) {
  const ab = b.sub(a)
  const t = p.sub(a).dot(ab).div(ab.dot(ab).max(0.000001)).clamp()
  return p.sub(a.add(ab.mul(t))).length()
}

export function angle(p: Node<'vec2'>) {
  // Bias the undefined azimuth at the exact motif center.
  return atan(p.y, p.x.add(0.000001))
}

export function rotatePoint(p: Node<'vec2'>, radians: Node<'float'>) {
  return vec2(p.x.mul(radians.cos()).sub(p.y.mul(radians.sin())), p.x.mul(radians.sin()).add(p.y.mul(radians.cos())))
}

/** Small pinnate fossil/fern silhouette with a curved rachis and paired leaflets. */
export function fern(point: Node<'vec2'>, footprint: Node<'float'>) {
  const p = vec2(point.x.sub(point.y.mul(5).sin().mul(0.028)), point.y)
  let distance = segment(p, vec2(0, -0.37), vec2(0, 0.36)).sub(0.006)
  for (let i = 0; i < 7; i++) {
    const y = -0.25 + i * 0.082
    const span = Math.sin((i + 1) / 8 * Math.PI) * 0.19
    const mirrored = vec2(p.x.abs(), p.y)
    const leaf = segment(mirrored, vec2(0, y), vec2(span, y + 0.1)).sub(0.013 - i * 0.0011)
    distance = distance.min(leaf)
  }
  return coverage(distance, footprint)
}

/** Filter a cosine rather than differentiating its thresholded or repeated output. */
export function wave(phase: Node<'float'>) {
  return phase.cos().mul(phase.fwidth().smoothstep(0.5, 3).oneMinus())
}

export function ring(r: Node<'float'>, radius: number, width: number, footprint: Node<'float'>) {
  return stroke(r.sub(radius), width, footprint)
}

