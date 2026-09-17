import type {Node} from 'three/webgpu'

import {Fn as fn, time} from 'three/tsl'

import {knotShell} from '../../candidates/gpt_astra/lib/knotShell.ts'
import {TAU} from '../../lib/TAU.ts'

export function ferroFields(tube: Node<'vec2'>) {
  const U = tube.x.mul(TAU * 28).add(time.mul(0.12))
  const V = tube.y.mul(TAU * 4)
  // Three reciprocal-lattice waves create a hexagonal Rosensweig pattern.
  const lattice = U.add(V.mul(0.5)).cos()
    .add(U.sub(V.mul(0.5)).cos())
    .add(V.cos())
    .add(1.5)
    .div(4.5)
    .clamp()
  const tip = lattice.pow(4.2)
  const pulse = time.mul(0.45)
    .add(tube.x.mul(TAU * 2))
    .sin()
    .mul(0.06)
    .add(0.94)
  return {
    U,
    V,
    tip,
    inset: tip.oneMinus().mul(-0.048).mul(pulse),
  }
}

export const ferroPosition = fn(([tube]: [Node<'vec2'>]) => {
  return knotShell(tube, ferroFields(tube).inset)
})
