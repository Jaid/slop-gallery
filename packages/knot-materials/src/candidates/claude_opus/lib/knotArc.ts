import type {Node} from 'three/webgpu'

import {TAU} from '../../../lib/TAU.ts'

/** Centerline length of the exhibition knot, in object units. */
export const knotLength = 7.177185
/** Tube circumference, in object units. */
export const knotCircumference = 0.816814
/**
 * Normalized arc length along the knot for `uv().x`. The (2, 3) knot races around its outer lobes
 * and dawdles through the crossings (speed varies 1.86×); this Fourier fit (error < 1e-6) makes
 * patterns evenly spaced along the centerline. Monotonic, and periodic like UV: f(u + 1) = f(u) + 1.
 */
export function knotArc(u: Node<'float'>) {
  return u.add(u.mul(3 * TAU).sin().mul(0.016341)).add(u.mul(6 * TAU).sin().mul(0.00041))
}
