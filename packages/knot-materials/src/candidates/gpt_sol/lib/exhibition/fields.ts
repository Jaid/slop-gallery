import type {Node} from 'three/webgpu'

import {mx_noise_float, vec3} from 'three/tsl'

import {TAU} from '../../../../lib/TAU.ts'

/** A closed UV domain: noise and its derivatives agree at both knot seams. */
export function closedDomain(tube: Node<'vec2'>, along: number, around: number) {
  const u = tube.x.mul(TAU)
  const v = tube.y.mul(TAU)
  return vec3(u.cos().mul(along), u.sin().mul(along).add(v.cos().mul(around)), v.sin().mul(around)).div(TAU)
}

/** Suppress unresolved harmonics before thresholding, not after they have aliased. */
export function resolved(footprint: Node<'float'>, start = 0.3, end = 1.2) {
  return footprint.smoothstep(start, end).oneMinus()
}

export function filteredCos(phase: Node<'float'>) {
  return phase.cos().mul(resolved(phase.fwidth(), 0.5, 2.8))
}

/** Three bounded octaves, without a runtime loop or an external noise texture. */
export function softNoise(p: Node<'vec3'>) {
  return mx_noise_float(p).mul(0.57).add(mx_noise_float(p.mul(2.03).add(11.8)).mul(0.28)).add(mx_noise_float(p.mul(4.09).add(27.4)).mul(0.15))
}
