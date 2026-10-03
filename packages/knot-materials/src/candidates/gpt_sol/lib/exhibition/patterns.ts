import type {Node} from 'three/webgpu'

import {atan, float, mx_cell_noise_vec3, mx_noise_float, vec2, vec3} from 'three/tsl'

import {TAU} from '../../../../lib/TAU.ts'
import {wrapCell} from '../../../../lib/wrapCell.ts'

/** Continuous noise over the UV torus, including both duplicate mesh seams. */
export function torusNoise(tube: Node<'vec2'>, along: number, around: number, seed = 0) {
  const u = tube.x.mul(TAU)
  const v = tube.y.mul(TAU)
  return mx_noise_float(vec3(u.cos().mul(along), u.sin().mul(along).add(v.cos().mul(around)), v.sin().mul(around)).add(seed))
}

/** Cell identities wrap, while the filtering footprint never differentiates a fract() seam. */
export function tiles(tube: Node<'vec2'>, along: number, around: number, seed: number) {
  const period = vec2(along, around)
  const q = tube.mul(period)
  const identity = wrapCell(q.floor(), period)
  return {
    q,
    point: q.fract().sub(0.5),
    random: mx_cell_noise_vec3(vec3(identity, seed)),
    footprint: q.fwidth().length().max(0.00001),
  }
}

export function segmentDistance(point: Node<'vec2'>, a: Node<'vec2'>, b: Node<'vec2'>) {
  const axis = b.sub(a)
  const projection = point.sub(a).dot(axis).div(axis.dot(axis).max(0.000001)).clamp()
  return point.sub(a.add(axis.mul(projection))).length()
}

/** A nonzero signed x keeps atan2 defined even at a motif’s exact center. */
export function polarAngle(point: Node<'vec2'>) {
  const epsilon = point.x.greaterThanEqual(0).select(0.000001, -0.000001)
  return atan(point.y, point.x.add(epsilon))
}

/** Subpixel lines lose coverage, not their identity; no reversed smoothstep edges. */
export function stroke(distance: Node<'float'>, halfWidth: Node<'float'> | number, footprint: Node<'float'>) {
  const width = typeof halfWidth === 'number' ? float(halfWidth) : halfWidth
  const aa = footprint.max(0.00001)
  return distance.abs().smoothstep(width, width.add(aa)).oneMinus()
    .mul(width.mul(2).div(aa).min(1))
}

export function fill(signedDistance: Node<'float'>, footprint: Node<'float'>) {
  const aa = footprint.max(0.00001)
  return signedDistance.smoothstep(aa.negate(), aa).oneMinus()
}

/** Bandlimited sinusoid. Its unresolved limit is its mean, rather than flickering stripes. */
export function wave(phase: Node<'float'>, footprint = phase.fwidth()) {
  return phase.cos().mul(footprint.smoothstep(0.5, 2.8).oneMinus())
}

/** Filter a narrow periodic ridge after the power, preserving its correct average coverage. */
export function crest(phase: Node<'float'>, power: number) {
  if (!Number.isSafeInteger(power) || power < 1 || power > 32) {
    throw new RangeError('Ridge power must be an integer from 1 to 32.')
  }
  let mean = 1
  for (let index = 1;index <= power;index++) {
    mean *= (2 * index - 1) / (2 * index)
  }
  const visibility = phase.fwidth().smoothstep(0.5, 2.8).oneMinus()
  return float(mean).mix(phase.cos().mul(0.5).add(0.5).pow(power), visibility)
}

export function resolved(coordinates: Node<'vec2'> | Node<'vec3'>, start = 0.3, end = 1.1) {
  return coordinates.fwidth().length().smoothstep(start, end).oneMinus()
}
