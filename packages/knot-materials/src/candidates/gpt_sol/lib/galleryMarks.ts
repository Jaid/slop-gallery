import type {Node} from 'three/webgpu'

import {float} from 'three/tsl'

/** Pixel-filtered disks, rings and strokes. Derivatives are evaluated before any periodic wrapping. */
export function disk(point: Node<'vec2'>, radius: number, footprint: Node<'float'>) {
  return point.length().smoothstep(footprint.negate().add(radius), footprint.add(radius)).oneMinus()
}
export function ring(point: Node<'vec2'>, radius: number, width: number, footprint: Node<'float'>) {
  return point.length().sub(radius).abs().smoothstep(width, footprint.add(width)).oneMinus()
}
export function segment(point: Node<'vec2'>, a: readonly [number, number], b: readonly [number, number], width: number, footprint: Node<'float'>) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const projection = point.x.sub(a[0]).mul(dx).add(point.y.sub(a[1]).mul(dy)).div(dx * dx + dy * dy).clamp()
  const distance = point.x.sub(float(a[0]).add(projection.mul(dx))).pow2().add(point.y.sub(float(a[1]).add(projection.mul(dy))).pow2()).sqrt()
  return distance.smoothstep(width, footprint.add(width)).oneMinus()
}
export function band(phase: Node<'float'>) {
  return phase.cos().mul(phase.fwidth().smoothstep(0.6, 2.6).oneMinus()).mul(0.5).add(0.5)
}
