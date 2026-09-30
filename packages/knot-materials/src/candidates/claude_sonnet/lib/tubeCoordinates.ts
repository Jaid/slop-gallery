import type {Node} from 'three/webgpu'

import {uv, vec2} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'

/** Centerline length of the exhibition's (2, 3) torus knot in object units. */
export const knotLength = 7.1772
/** Circumference of the knot's tube in object units. */
export const tubeCircumference = Math.PI * 2 * 0.13
/** How many tube circumferences fit along the knot; multiply around-counts by this for square cells. */
export const tubeAspect = knotLength / tubeCircumference
/** Normalized arc length along the knot from the geometry's raw `uv().x`. The raw parameter runs ~1.9× faster on the outer lobes; this Fourier fit is accurate to 1e-7 and keeps s(0)=0, s(1)=1. */
export function knotArcLength(u: Node<'float'>) {
  return u.add(u.mul(Math.PI * 6).sin().mul(0.0163414)).add(u.mul(Math.PI * 12).sin().mul(0.0004098)).sub(u.mul(Math.PI * 18).sin().mul(0.0000429))
}
/** Seam-safe tube coordinates: `along` and `around` in [0, 1), with evenly spaced arc length. */
export function tubeCoordinates(tube: Node<'vec2'> = uv()) {
  return {
    along: knotArcLength(tube.x),
    around: tube.y,
  }
}
/** A seamless noise coordinate for a periodic parameter in [0, 1): the loop is embedded as a circle whose circumference is `period` noise units, so features keep that size and the start meets the end without a seam. For example `loopCoordinate(along, knotLength * 9)` gives nine noise units per object unit along the knot. */
export function loopCoordinate(t: Node<'float'>, period: number) {
  const radius = period / TAU
  const angle = t.mul(TAU)
  return vec2(angle.cos(), angle.sin()).mul(radius)
}
