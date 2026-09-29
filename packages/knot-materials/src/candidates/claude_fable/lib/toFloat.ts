import type {Node} from 'three/webgpu'

import {float} from 'three/tsl'

/** Accept a plain number or a float node wherever a shader parameter may be either. */
export function toFloat(value: Node<'float'> | number): Node<'float'> {
  return typeof value === 'number' ? float(value) : value
}
