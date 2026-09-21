import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

/** Linear ramp that is 0 below `a` and 1 above `b`. */
const ramp = (x: Node<'float'>, a: number, b: number) => x.sub(a).div(b - a).clamp()
/**
 * Approximation of the visible spectrum in linear light: the classic piecewise-linear fit of the
 * RGB primaries plus the luminosity roll-off at both ends of the band, so the Bragg wavelength of
 * an opal turns into the familiar violet → blue → green → yellow → red march.
 */
export function wavelengthToLinearColor(wavelength: Node<'float'>) {
  const w = wavelength
  const r = ramp(w, 505, 580).mul(ramp(w, 640, 700).oneMinus())
  const g = ramp(w, 430, 490).mul(ramp(w, 510, 590).oneMinus())
  const b = ramp(w, 380, 440).mul(ramp(w, 470, 520).oneMinus())
  const shoulder = ramp(w, 380, 425).mul(0.35).add(0.65)
  const tail = ramp(w, 640, 690).mul(0.5).add(0.5)
  const rolloff = shoulder.mul(tail).mul(ramp(w, 690, 780).oneMinus())
  return vec3(r, g, b).mul(rolloff)
}
