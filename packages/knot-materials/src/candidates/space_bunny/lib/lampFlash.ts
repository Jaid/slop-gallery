/** Blinn lobe of every gallery lamp, for view-dependent flashes on tilted micro-structures. */
/** Blinn lobe of every gallery lamp, for view-dependent flashes on tilted micro-structures. */
import type {Node} from 'three/webgpu'

import {float, positionViewDirection} from 'three/tsl'

import {studioLightsView} from './studioLights.ts'

export function lampFlash(normal: Node<'vec3'>, sharpness: Node<'float'> | number) {
  const exponent = typeof sharpness === 'number' ? float(sharpness) : sharpness
  let sum: Node<'float'> = float(0)
  for (const lamp of studioLightsView) {
    const half = lamp.add(positionViewDirection).normalize()
    sum = sum.add(normal.dot(half).clamp().pow(exponent))
  }
  return sum
}
