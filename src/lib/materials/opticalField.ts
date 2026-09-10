import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

/** Linear-light interference palette, with no texture lookup or hue discontinuity. */
export function spectralColor(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.46).add(0.54)
}

/** Filter the signed field before thresholding, then suppress unresolved detail. */
export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus()
    .mul(footprint.smoothstep(width * 3, width * 12).oneMinus())
}

/** Periodic bands settle to their mean rather than aliasing at a shallow angle. */
export function opticalBands(phase: Node<'float'>) {
  const visibility = phase.fwidth().smoothstep(0.6, 3).oneMinus()
  return phase.cos().mul(visibility).mul(0.5).add(0.5)
}
