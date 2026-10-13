import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'
import {Color} from 'three/webgpu'

/** A CSS color as a linear working-space `vec3`, for palettes that need to be mixed and indexed as plain vectors. */
export function rgb(css: string): Node<'vec3'> {
  const {r, g, b} = new Color(css)
  return vec3(r, g, b)
}
