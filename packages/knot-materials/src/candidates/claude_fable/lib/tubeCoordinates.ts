import type {Node} from 'three/webgpu'

import {uv, vec2, vec3} from 'three/tsl'

import {TAU} from './TAU.ts'

/** Centerline length of the exhibition's (2, 3) torus knot in object units. */
export const knotLength = 7.1772
/** Circumference of the knot's tube in object units. */
export const tubeCircumference = Math.PI * 2 * 0.13
/** How many tube circumferences fit along the knot; multiply around-counts by this for square cells. */
export const tubeAspect = knotLength / tubeCircumference
/**
 * Normalized arc length along the knot from the geometry's raw `uv().x`.
 * The raw parameter runs ~1.9× faster on the outer lobes; this Fourier fit is accurate to 1e-7 and keeps s(0)=0, s(1)=1.
 */
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
/**
 * A seamless noise coordinate for a periodic parameter in [0, 1): the loop is embedded as a circle whose circumference is
 * `period` noise units, so features keep that size and the start meets the end without a seam.
 * For example `loopCoordinate(along, knotLength * 9)` gives nine noise units per object unit along the knot.
 */
export function loopCoordinate(t: Node<'float'>, period: number) {
  const radius = period / TAU
  const angle = t.mul(TAU)
  return vec2(angle.cos(), angle.sin()).mul(radius)
}/**
 * A seamless lattice over the tube surface with `around` cells around the tube and enough cells along it to keep them
 * square in physical units. Returns the lattice coordinate, its integer period for `wrapCell`, and the physical size of
 * one cell in object units, so distances measured in lattice units can be converted to object units.
 */
export function tubeLattice(around: number, tube: Node<'vec2'> = uv()) {
  const along = Math.round(around * tubeAspect)
  const coordinates = tubeCoordinates(tube)
  return {
    lattice: vec2(coordinates.along.mul(along), coordinates.around.mul(around)),
    period: vec2(along, around),
    cellSize: tubeCircumference / around,
  }
}
/**
 * A seamless 3D noise coordinate for the tube surface: the (along, around) torus is embedded in noise space with the
 * given circumferences, so a noise field sampled here repeats exactly at both seams. `alongPeriod` and `aroundPeriod`
 * are in noise units; for square texels choose `alongPeriod = aroundPeriod * tubeAspect`.
 */
export function tubeNoiseCoordinate(along: Node<'float'>, around: Node<'float'>, alongPeriod: number, aroundPeriod: number) {
  const u = along.mul(TAU)
  const v = around.mul(TAU)
  const major = alongPeriod / TAU
  const minor = aroundPeriod / TAU
  const ring = v.cos().mul(minor).add(major)
  return vec3(ring.mul(u.cos()), ring.mul(u.sin()), v.sin().mul(minor))
}
