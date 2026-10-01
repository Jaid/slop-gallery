import type {Node} from 'three/webgpu'

import {float, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../../lib/cellNoiseVec3.ts'
import {wrapCell} from '../../../../lib/wrapCell.ts'

/** Coverage of a signed distance, including subpixel ink rather than a hard threshold. */
export function stroke(distance: Node<'float'>, width: Node<'float'> | number) {
  const w = typeof width === 'number' ? float(width) : width
  const footprint = distance.fwidth().max(0.00001)
  return distance.abs().smoothstep(w, w.add(footprint)).oneMinus().mul(w.mul(2).div(footprint).min(1))
}

export function fill(distance: Node<'float'>) {
  const footprint = distance.fwidth().max(0.00001)
  return distance.smoothstep(footprint.negate(), footprint).oneMinus()
}

/** A smooth periodic signal converges to its average when its harmonics become unresolved. */
export function wave(phase: Node<'float'>, footprint: Node<'float'> = phase.fwidth()) {
  return phase.cos().mul(footprint.pow2().mul(-0.22).exp()).mul(0.5).add(0.5)
}

/** Differentiate the angular coordinate before atan's branch cut, not the discontinuous angle itself. */
export function angularFootprint(p: Node<'vec2'>) {
  const dx = p.dFdx()
  const dy = p.dFdy()
  return p.x.mul(dx.y).sub(p.y.mul(dx.x)).abs().add(p.x.mul(dy.y).sub(p.y.mul(dy.x)).abs()).div(p.dot(p).max(0.0001))
}

export function resolved(coordinate: Node<'vec2'> | Node<'vec3'>, start = 0.35, end = 1.2) {
  return coordinate.fwidth().length().smoothstep(start, end).oneMinus()
}

/** Staggered cells retain their identity at both UV seams. Use an even longitudinal count. */
export function tiles(tube: Node<'vec2'>, counts: [number, number], seed = 0, stagger = true) {
  if (counts.some(count => !Number.isSafeInteger(count) || count < 1)) {
    throw new RangeError('Tile counts must be positive safe integers.')
  }
  if (stagger && counts[0] % 2 !== 0) {
    throw new RangeError('Staggered longitudinal tile counts must be even.')
  }
  const period = vec2(...counts)
  const coordinate = tube.mul(period)
  const q = vec2(coordinate.x, coordinate.y.add(stagger ? coordinate.x.floor().mod(2).mul(0.5) : 0))
  const cell = wrapCell(q.floor(), period)
  return {
    local: q.fract().sub(0.5),
    cell,
    random: cellNoiseVec3(vec3(cell, seed)),
    coordinate,
  }
}

/** Finite line segment distance; safe even when a procedural endpoint collapses. */
export function segment(p: Node<'vec2'>, a: Node<'vec2'>, b: Node<'vec2'>) {
  const direction = b.sub(a)
  const t = p.sub(a).dot(direction).div(direction.dot(direction).max(1e-8)).clamp()
  return p.sub(a.add(direction.mul(t))).length()
}

export function turn(p: Node<'vec2'>, angle: Node<'float'> | number) {
  const a = typeof angle === 'number' ? float(angle) : angle
  return vec2(p.x.mul(a.cos()).sub(p.y.mul(a.sin())), p.x.mul(a.sin()).add(p.y.mul(a.cos())))
}
