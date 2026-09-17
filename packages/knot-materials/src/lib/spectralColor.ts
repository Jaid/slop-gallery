import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

/** A continuous interference palette in linear light, with no texture lookup. */
export function spectralColor(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.46).add(0.54)
}
