import type {Node} from 'three/webgpu'

import {float, uv, vec2, vec3} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'

/** Centerline arc length of the exhibition’s (2, 3) torus knot in object units. */
export const knotLength = 7.177185
/** Radius of the knot’s tube. */
export const knotTubeRadius = 0.13
/** Circumference of the knot’s tube in object units. */
export const knotCircumference = TAU * knotTubeRadius
/** How many tube circumferences fit along the knot; multiply around-counts by this for square cells. */
export const tubeAspect = knotLength / knotCircumference
/** Sine coefficients of s(u) − knotLength·u in sin(2π·3k·u), k = 1…5, where s is the centerline arc length at the mesh parameter u. */
export const arcSeries = [0.11728549688483293, 0.002941327254217849, -0.0003082105983259309, 0.000030367793123863053, -0.000002321369735143625]
/** Twist of the mesh’s ring frame against a parallel-transport frame (radians), as sine coefficients in sin(2π·3k·u), k = 1…6. */
export const twistSeries = [0.261045, -0.007577, -0.059908, 0.044147, -0.019332, 0.004624]
const series = (u: Node<'float'>, coefficients: ReadonlyArray<number>) => {
  let sum: Node<'float'> = float(0)
  for (const [index, coefficient] of coefficients.entries()) {
    sum = sum.add(u.mul(TAU * 3 * (index + 1)).sin().mul(coefficient))
  }
  return sum
}
/** Around-the-tube coordinate in turns, with the mesh’s frame twist removed so v-lines run straight along the knot. */
export function tubeTurns(tube: Node<'vec2'> = uv()) {
  return tube.y.add(series(tube.x, twistSeries).div(TAU))
}
/** Tube UV → object-length coordinates: x is the arc length along the knot, y is the distance around the tube. */
export function tubeMetric(tube: Node<'vec2'> = uv()) {
  return vec2(tube.x.mul(knotLength).add(series(tube.x, arcSeries)), tubeTurns(tube).mul(knotCircumference))
}
/** Tube UV → cell coordinates with `along` × `around` whole cells, tiling both seams exactly. */
export function tubeCells(tube: Node<'vec2'>, along: number, around: number) {
  return vec2(tubeMetric(tube).x.mul(along / knotLength), tubeTurns(tube).mul(around))
}
/**
 * A seamless three-dimensional embedding of both periodic tube parameters. The major radius sets the
 * feature scale along the knot, the minor radius the scale around the tube, so a volume noise sampled
 * through it can be stretched into grain without opening either seam.
 */
export function tubeTorus(tube: Node<'vec2'>, major: number, minor: number) {
  const u = tube.x.mul(TAU)
  const v = tube.y.mul(TAU)
  const ring = float(major).add(float(minor).mul(v.cos()))
  return vec3(ring.mul(u.cos()), ring.mul(u.sin()), float(minor).mul(v.sin()))
}
/**
 * Embed a periodic parameter in [0, 1) as a circle of circumference `period` noise units, so a pattern
 * with features of that size meets its own start without a seam.
 */
export function loopCoordinate(t: Node<'float'>, period: number) {
  const radius = period / TAU
  const angle = t.mul(TAU)
  return vec2(angle.cos(), angle.sin()).mul(radius)
}
/** Distance on the tube's periodic world-length chart, with the short way around each seam. */
export function tubeDelta(from: Node<'vec2'>, to: Node<'vec2'>) {
  const dx = from.x.sub(to.x).div(knotLength)
  const dy = from.y.sub(to.y).div(knotCircumference)
  return vec2(dx.sub(dx.round()).mul(knotLength), dy.sub(dy.round()).mul(knotCircumference))
}
