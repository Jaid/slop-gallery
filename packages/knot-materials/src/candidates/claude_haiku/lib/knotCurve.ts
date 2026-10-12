import type {Node} from 'three/webgpu'

import {Fn, vec3} from 'three/tsl'

/** Centerline matching the exhibition's (2, 3) torus knot. */
export const knotCurve = Fn(([angle]: [Node<'float'>]) => {
  const phase = angle.mul(1.5)
  const radius = phase.cos().add(2).mul(0.225)
  return vec3(radius.mul(angle.cos()), radius.mul(angle.sin()), phase.sin().mul(0.225))
})
/** Arc length of one full pass of knotCurve over angle 0 to 4π, integrated once in JavaScript. Matches the geometry's tube.x parameter. */
export const knotLength = (() => {
  const sample = (angle: number) => {
    const phase = angle * 1.5
    const radius = (Math.cos(phase) + 2) * 0.225
    return [radius * Math.cos(angle), radius * Math.sin(angle), Math.sin(phase) * 0.225]
  }
  const steps = 4096
  let length = 0
  let previous = sample(0)
  for (let index = 1;index <= steps;index++) {
    const current = sample(Math.PI * 4 * index / steps)
    length += Math.hypot(current[0] - previous[0], current[1] - previous[1], current[2] - previous[2])
    previous = current
  }
  return length
})()
