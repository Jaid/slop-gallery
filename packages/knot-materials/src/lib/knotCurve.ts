import type {Node} from 'three/webgpu'

import {Fn, vec3} from 'three/tsl'

/** Centerline matching the exhibition's (2, 3) torus knot. */
export const knotCurve = Fn(([angle]: [Node<'float'>]) => {
  const phase = angle.mul(1.5)
  const radius = phase.cos().add(2).mul(0.225)
  return vec3(radius.mul(angle.cos()), radius.mul(angle.sin()), phase.sin().mul(0.225))
})
