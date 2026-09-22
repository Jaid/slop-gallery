import type {Node} from 'three/webgpu'

import {mx_noise_float, mx_worley_noise_vec3, vec3} from 'three/tsl'

/** Fracture map: a few warped structural faults for the gold, plus an independent fine craquelure web. */
export function craquelure(point: Node<'vec3'>) {
  const bend = mx_noise_float(point.mul(1.6)).mul(0.55)
  const bend2 = mx_noise_float(point.mul(3.1).add(8)).mul(0.2)
  const coarse = point.mul(1.35).add(vec3(bend, bend2, bend.mul(-0.6)))
  const major = mx_worley_noise_vec3(coarse, 1, 0)
  const majorGap = major.y.sub(major.x)
  const minor = mx_worley_noise_vec3(point.mul(11).add(vec3(11, 4, 7)), 1, 0)
  const minorGap = minor.y.sub(minor.x)
  const age = mx_noise_float(point.mul(0.9).add(5)).mul(0.5).add(0.5)
  const goldCore = majorGap.smoothstep(0.02, 0.055).oneMinus().mul(age.smoothstep(0.3, 0.55))
  const hairCore = minorGap.smoothstep(0.004, 0.012).oneMinus().mul(goldCore.oneMinus().clamp())
  const footprint = majorGap.fwidth().max(0.0004)
  const goldWidth = footprint.mul(2).add(0.06)
  const gold = majorGap.smoothstep(goldWidth.mul(0.35), goldWidth).oneMinus().mul(age.smoothstep(0.3, 0.55))
  const hairWidth = footprint.add(0.012)
  const hair = minorGap.smoothstep(hairWidth.mul(0.3), hairWidth).oneMinus().mul(gold.oneMinus().clamp())
  return {
    gold: gold.clamp(0, 1),
    goldCore: goldCore.clamp(0, 1),
    hair: hair.clamp(0, 1),
    hairCore: hairCore.clamp(0, 1),
  }
}
