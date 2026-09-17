import type {Node} from 'three/webgpu'

import {Fn as fn} from 'three/tsl'

import {knotShell} from '../../candidates/gpt_astra/lib/knotShell.ts'
import {TAU} from '../../lib/TAU.ts'

export function roundedTriangle(phase: Node<'float'>) {
  return phase.sin().mul(0.975).asin().div(Math.asin(0.975))
}

export function foldFields(tube: Node<'vec2'>) {
  const V = tube.y.mul(TAU * 4)
  const zigzag = roundedTriangle(V)
  const U = tube.x.mul(TAU * 24).add(zigzag.mul(1.2))
  const pleat = roundedTriangle(U)
  return {
    U,
    V,
    pleat,
    zigzag,
    inset: pleat.mul(0.017).add(zigzag.mul(0.006)).sub(0.025),
  }
}

export const foldedPosition = fn(([tube]: [Node<'vec2'>]) => {
  return knotShell(tube, foldFields(tube).inset)
})
