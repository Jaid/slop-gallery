import type {Node} from 'three/webgpu'

import {mx_noise_float, vec3} from 'three/tsl'

/** A continuous object-space map: no UV seam and no time-dependent geography. */
export function atlasElevation(position: Node<'vec3'>) {
  const broad = mx_noise_float(position.mul(3.8).add(vec3(8, 2, 5)))
  const tributaries = mx_noise_float(position.mul(10).add(vec3(3, 9, 1)))
  return broad.mul(0.76).add(tributaries.mul(0.24)).mul(0.5).add(0.5).clamp()
}

/** The signed relief stays within the metadata bound even at noise extrema. */
export function atlasRelief(elevation: Node<'float'>) {
  return elevation.sub(0.5).mul(0.016)
}
