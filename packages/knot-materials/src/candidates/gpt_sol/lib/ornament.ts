import type {Node} from 'three/webgpu'

import {vec2} from 'three/tsl'

/** Pixel-filtered, coverage-preserving engraved line in a local two-dimensional chart. */
export function stroke(distance: Node<'float'>, width: number) {
  const footprint = distance.fwidth().max(0.0001)
  return distance.abs().smoothstep(width, footprint.add(width)).oneMinus().mul(width * 2).div(footprint).min(1)
}
/** Euclidean distance to a segment; the denominator is constant and never zero. */
export function segment(point: Node<'vec2'>, a: readonly [number, number], b: readonly [number, number]) {
  const from = vec2(...a)
  const delta = vec2(...b).sub(from)
  const progress = point.sub(from).dot(delta).div(delta.dot(delta)).clamp()
  return point.sub(from.add(delta.mul(progress))).length()
}
/** A point whose halo fades gently but whose center remains crisp. */
export function jewel(point: Node<'vec2'>, center: readonly [number, number], radius: number) {
  const d = point.sub(vec2(...center)).length()
  const aa = d.fwidth().max(0.0001)
  return d.smoothstep(radius, aa.add(radius)).oneMinus().mul(radius * 2).div(aa).min(1)
}
/** Cyclic chart with a period aligned to the mesh UV seam. */
export function tile(uv: Node<'vec2'>, columns: number, rows: number) {
  return uv.mul(vec2(columns, rows)).fract()
}
