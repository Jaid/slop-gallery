import type {Node} from 'three/webgpu'

import {float} from 'three/tsl'

import {TAU} from '../../lib/TAU.ts'

// One draped harmonic: `ku` cycles along the knot, `kv` around the tube, a phase, an amplitude and
// a drift rate. Integer cycle counts keep the cloth seamless across both UV wraps.
export type Harmonic = readonly [ku: number, kv: number, phase: number, amplitude: number, rate: number]
export const drapeHarmonics: ReadonlyArray<Harmonic> = [[2, 1, 5.6, 0.34, 0.031], [3, 1, 0.4, 0.5, -0.019], [5, 2, 2.1, 0.28, 0.013], [7, 3, 4.2, 0.15, -0.008]]
export const wrinkleHarmonics: ReadonlyArray<Harmonic> = [[13, 4, 1.1, 0.42, 0.024], [19, 6, 3.3, 0.3, -0.015], [23, 7, 5.5, 0.2, 0.009], [29, 8, 0.9, 0.14, -0.006]]
/** The nap runs around the tube, so its harmonics climb far faster along the knot than around it. */
export const pileHarmonics: ReadonlyArray<Harmonic> = [[200, 8, 0.7, 0.5, 0.05], [264, 12, 2.9, 0.3, -0.03], [332, 16, 4.1, 0.2, 0.02]]
export function weave(u: Node<'float'>, v: Node<'float'>, clock: Node<'float'>, harmonics: ReadonlyArray<Harmonic>) {
  let value: Node<'float'> = float(0)
  let slopeU: Node<'float'> = float(0)
  let slopeV: Node<'float'> = float(0)
  let norm = 0
  for (const [ku, kv, phase, amplitude, rate] of harmonics) {
    const angle = u.mul(TAU * ku).add(v.mul(TAU * kv)).add(phase).add(clock.mul(rate))
    value = value.add(angle.sin().mul(amplitude))
    slopeU = slopeU.add(angle.cos().mul(amplitude * TAU * ku))
    slopeV = slopeV.add(angle.cos().mul(amplitude * TAU * kv))
    norm += Math.abs(amplitude)
  }
  return {
    slopeU: slopeU.div(norm),
    slopeV: slopeV.div(norm),
    value: value.div(norm),
  }
}
