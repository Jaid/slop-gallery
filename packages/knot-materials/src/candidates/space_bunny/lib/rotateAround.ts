/** Rotate a vector around a unit axis (Rodrigues), for tilted lamellae, barbs and needle fields. */
/** Rotate a vector around a unit axis (Rodrigues), for tilted lamellae, barbs and needle fields. */
import type {Node} from 'three/webgpu'

import {cross, dot} from 'three/tsl'

export function rotateAround(vector: Node<'vec3'>, axis: Node<'vec3'>, angle: Node<'float'>) {
  const c = angle.cos()
  const s = angle.sin()
  return vector.mul(c).add(cross(axis, vector).mul(s)).add(axis.mul(dot(axis, vector).mul(c.oneMinus())))
}
