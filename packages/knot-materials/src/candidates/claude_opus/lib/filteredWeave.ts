import type {Node} from 'three/webgpu'

import {float} from 'three/tsl'

/** One sinusoidal factor `offset + amplitude·cos(phase)` of a product of gratings. */
export type GratingFactor = {
  amplitude: number
  offset: number
  phase: Node<'float'>
}
/**
 * Box-filtered cosine: the exact mean of cos over a pixel footprint of `fwidth(phase)` is cos(φ)·sinc(w/2). Detail
 * finer than a pixel averages to zero instead of aliasing; everything past the first lobe is dropped.
 */
export function filteredCos(phase: Node<'float'>) {
  const half = phase.fwidth().mul(0.5).max(1e-4)
  return phase.cos().mul(half.lessThan(Math.PI).select(half.sin().div(half), 0))
}
/**
 * Pixel-filtered product of sinusoidal gratings, expanded into a sum of cosines of phase sums and differences before
 * filtering. Fine carriers average away while slow beats – moiré – survive at any distance, exactly as an eye sees two
 * fine meshes laid over each other.
 */
export function filteredProduct(factors: Array<GratingFactor>) {
  let sum: Node<'float'> = float(0)
  const count = factors.length
  for (let mask = 0;mask < 1 << count;mask++) {
    let coefficient = 1
    const members: Array<number> = []
    for (let index = 0;index < count;index++) {
      if (mask & 1 << index) {
        coefficient *= factors[index].amplitude
        members.push(index)
      } else {
        coefficient *= factors[index].offset
      }
    }
    if (coefficient === 0) {
      continue
    }
    if (!members.length) {
      sum = sum.add(coefficient)
      continue
    }
// Π cos φᵢ = 2^(1−k) Σ over sign patterns with the first sign fixed of cos(Σ ±φᵢ).
    const weight = coefficient / 2 ** (members.length - 1)
    for (let signs = 0;signs < 1 << members.length - 1;signs++) {
      let phase = factors[members[0]].phase
      for (let index = 1;index < members.length;index++) {
        phase = signs & 1 << index - 1 ? phase.sub(factors[members[index]].phase) : phase.add(factors[members[index]].phase)
      }
      sum = sum.add(filteredCos(phase).mul(weight))
    }
  }
  return sum
}
