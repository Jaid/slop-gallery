import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

/** A full-saturation hue wheel in linear light: the color of a diffraction grating, not a pigment. */
export function diffractionSpectrum(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.5).add(0.5)
}
