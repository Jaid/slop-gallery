import type {Node} from 'three/webgpu'

import {normalLocal, tangentLocal, uv, vec2, vec3} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'

/** Centerline length of the exhibition’s (2, 3) torus knot in object units. */
export const knotLength = 7.1772
/** Radius of the knot’s tube in object units. */
export const tubeRadius = 0.13
/** Circumference of the knot’s tube in object units. */
export const tubeCircumference = TAU * tubeRadius
/**
 * Normalized arc length along the knot from the geometry’s raw `uv().x`.
 * The raw parameter runs ~1.9× faster on the outer lobes; this Fourier fit keeps s(0) = 0 and s(1) = 1.
 */
export function knotArcLength(u: Node<'float'>) {
  return u.add(u.mul(Math.PI * 6).sin().mul(0.0163414)).add(u.mul(Math.PI * 12).sin().mul(0.0004098)).sub(u.mul(Math.PI * 18).sin().mul(0.0000429))
}
/** Seam-safe tube coordinates in [0, 1): evenly spaced `along` arc length and `around` the tube. */
export function tubeSpace(tube: Node<'vec2'> = uv()) {
  return {
    along: knotArcLength(tube.x),
    around: tube.y,
  }
}
/**
 * Seamless 3D noise domain for the tube’s (along, around) torus. Both loops are embedded as circles whose circumferences are
 * `alongScale` and `aroundScale` noise units, so features keep those sizes and neither UV seam ever shows.
 */
export function torusDomain(along: Node<'float'>, around: Node<'float'>, alongScale: number, aroundScale: number) {
  const a = along.mul(TAU)
  const b = around.mul(TAU)
  const ra = alongScale / TAU
  const rb = aroundScale / TAU
  return vec3(a.cos().mul(ra), a.sin().mul(ra).add(b.cos().mul(rb)), b.sin().mul(rb))
}
/** Local object-space surface frame: outward normal, the knot’s running direction and the direction around the tube. */
export function surfaceFrame() {
  const normal = normalLocal.normalize()
  const along = tangentLocal.xyz.normalize()
  return {
    normal,
    along,
    around: normal.cross(along).normalize(),
  }
}
/**
 * Length of a straight ray inside the tube, entering through the surface with object-space direction `direction`.
 * Treats the tube locally as a cylinder of `tubeRadius` around `axis`; capped so rays running along the axis stay finite.
 */
export function tubeChord(direction: Node<'vec3'>, normal: Node<'vec3'>, axis: Node<'vec3'>, cap = 0.55) {
  const entering = direction.dot(normal).negate().max(0)
  const across = direction.dot(axis).pow2().oneMinus().max(0.0001)
  return entering.mul(tubeRadius * 2).div(across).min(cap)
}
/** Tangent-plane offset seen through a transparent layer `depth` units thick, for object-space parallax. */
export function parallaxOffset(view: Node<'vec3'>, normal: Node<'vec3'>, depth: Node<'float'> | number, minimumFacing = 0.22) {
  const cosine = view.dot(normal).max(minimumFacing)
  return view.sub(normal.mul(view.dot(normal))).div(cosine).mul(depth).negate()
}
/** Physical (along, around) lengths of a tube-space vector, for isotropic patterns in object units. */
export const tubeMetric = vec2(knotLength, tubeCircumference)
