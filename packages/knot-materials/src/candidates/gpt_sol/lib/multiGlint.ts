import type {Node} from 'three/webgpu'

import {float, positionViewDirection, vec3} from 'three/tsl'

export function multiGlint(normal: Node<'vec3'>, sharpness: number) {
  const lamps = [
    vec3(0.41, 0.76, 0.49),
    vec3(-0.68, 0.2, 0.71),
    vec3(0.08, -0.42, 0.9),
  ]
  let sum: Node<'float'> = float(0)
  for (const lamp of lamps) {
    const halfVector = lamp
      .normalize()
      .add(positionViewDirection)
      .normalize()
    sum = sum.add(normal.dot(halfVector).clamp().pow(sharpness))
  }
  return sum
}
