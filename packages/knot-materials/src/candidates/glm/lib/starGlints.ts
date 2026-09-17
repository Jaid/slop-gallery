import type {Node} from 'three/webgpu'

import {time, vec3} from 'three/tsl'

import {hash3} from './hash3.ts'

export function starGlints(field: Node<'vec3'>, view: Node<'vec3'>, sharpness = 22): Node<'float'> {
  const a = hash3(field)
  const b = hash3(field.add(vec3(19.7, 7.3, 3.1)))
  const phase = time.mul(0.3).fract().mul(2).oneMinus().abs()
  const direction = a.mul(phase).add(b.mul(phase.oneMinus())).add(vec3(0.017, 0.005, 0.011)).normalize()
  return view.dot(direction).clamp().pow(sharpness)
}
