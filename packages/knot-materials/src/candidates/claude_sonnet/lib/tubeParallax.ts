import type {knotFrame} from './knotFrame.ts'
import type {Node} from 'three/webgpu'

import {vec2} from 'three/tsl'

import {knotCircumference, knotLength} from './knotFrame.ts'

/** How far a layer `depth` below the surface appears to slide in (u, v) when seen from `view` (object space, toward the eye). Add the result to the surface coordinates before sampling that layer. */
export function tubeParallax(frame: ReturnType<typeof knotFrame>, view: Node<'vec3'>, depth: Node<'float'> | number) {
  const facing = frame.normal.dot(view).max(0.22)
  const reach = facing.reciprocal().mul(depth)
  return vec2(view.dot(frame.axis).mul(reach).div(knotLength).negate(), view.dot(frame.across).mul(reach).div(knotCircumference).negate())
}
