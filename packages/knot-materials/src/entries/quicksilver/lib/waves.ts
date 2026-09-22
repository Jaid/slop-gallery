import type {Node} from 'three/webgpu'

import {vec2} from 'three/tsl'

/** Slow surface-tension swell as a height field; its slope is recovered by proceduralNormal downstream. */
export function waves(point: Node<'vec3'>) {
  const a = vec2(1, 0.6).normalize()
  const b = vec2(-0.35, 1).normalize()
  const p = vec2(point.x.add(point.z.mul(0.7)), point.y)
  const phaseA = p.dot(a).mul(5.2)
  const phaseB = p.dot(b).mul(8.7)
  const height = phaseA.sin().mul(0.55).add(phaseB.sin().mul(0.3)).add(p.dot(a).mul(2.3).sin().mul(0.35))
  return height
}
