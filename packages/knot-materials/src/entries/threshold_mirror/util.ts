import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

export function rotateY(v: Node<'vec3'>, angle: Node<'float'>) {
  const c = angle.cos()
  const s = angle.sin()
  return vec3(v.x.mul(c).sub(v.z.mul(s)), v.y, v.x.mul(s).add(v.z.mul(c)))
}
