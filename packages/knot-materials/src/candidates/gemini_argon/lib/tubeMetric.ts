import type {Node} from 'three/webgpu'

import {float, vec2} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'

/** Centerline arc length of the exhibition’s (2, 3) torus knot. */
export const knotLength = 7.177185
export const knotTubeRadius = 0.13
export const knotCircumference = TAU * knotTubeRadius
/** Sine coefficients of s(u) − knotLength·u in sin(2π·3k·u), k = 1…5, where s is the centerline arc length at the mesh parameter u. The knot is not parametrized by arc length (its speed varies by 1.9×); this series undoes that. It vanishes at u = 0 and 1, so it never opens a seam. */
export const arcSeries = [0.11728549688483293, 0.002941327254217849, -0.0003082105983259309, 0.000030367793123863053, -0.000002321369735143625]
/** Twist of the mesh’s ring frame against a parallel-transport frame (radians), as sine coefficients in sin(2π·3k·u), k = 1…6. The sum vanishes at u = 0 and 1, so correcting by it never opens a seam, while it removes the local shear of the UV grid (up to 28° raw, 8° corrected). Only a uniform ~3° slant remains. */
export const twistSeries = [0.261045, -0.007577, -0.059908, 0.044147, -0.019332, 0.004624]
const series = (u: Node<'float'>, coefficients: ReadonlyArray<number>) => {
  let sum: Node<'float'> = float(0)
  for (const [index, coefficient] of coefficients.entries()) {
    sum = sum.add(u.mul(TAU * 3 * (index + 1)).sin().mul(coefficient))
  }
  return sum
}
/** Around-the-tube coordinate in turns, with the mesh’s frame twist removed so v-lines run straight along the knot. */
export function tubeTurns(tube: Node<'vec2'>) {
  return tube.y.add(series(tube.x, twistSeries).div(TAU))
}
/** Tube UV → world-length coordinates: x is the arc length along the knot (corrected for its uneven parametrization), y is the distance around the tube. Whole-number cell counts over `knotLength` and `knotCircumference` tile the seams exactly. */
export function tubeMetric(tube: Node<'vec2'>) {
  return vec2(tube.x.mul(knotLength).add(series(tube.x, arcSeries)), tubeTurns(tube).mul(knotCircumference))
}
/** Tube UV → cell coordinates with `along` × `around` whole cells (tiles the seams; cells are near-square when along ≈ 8.79 × around). */
export function tubeCells(tube: Node<'vec2'>, along: number, around: number) {
  return vec2(tubeMetric(tube).x.mul(along / knotLength), tubeTurns(tube).mul(around))
}
