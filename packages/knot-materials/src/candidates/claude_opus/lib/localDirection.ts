import type {Triple} from '../../../lib/Triple.ts'
import type {Node} from 'three/webgpu'

import {modelWorldMatrix, modelWorldMatrixInverse, vec3, vec4} from 'three/tsl'

/** A world-space direction (for example a gallery light) expressed in the object space of the knot. */
export function localDirection(world: Node<'vec3'> | Triple) {
  const direction = Array.isArray(world) ? vec3(...world) : world
  return modelWorldMatrixInverse.mul(vec4(direction, 0)).xyz.normalize()
}
/** An object-space direction expressed in world space. */
export function worldDirection(local: Node<'vec3'>) {
  return modelWorldMatrix.mul(vec4(local, 0)).xyz.normalize()
}
