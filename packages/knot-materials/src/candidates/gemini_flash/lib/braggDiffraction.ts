import type {Node} from 'three/webgpu'

import {color, float} from 'three/tsl'

/**
 * Bragg diffraction play-of-color for photonic crystals and precious opals.
 * Computes spectral wavelength selection from the lattice plane alignment with the half-vector.
 */
export function braggDiffraction(
  latticeNormal: Node<'vec3'>,
  halfVector: Node<'vec3'>,
  dSpacing: Node<'float'> | number,
  sharpness = 40,
) {
  const spacing = typeof dSpacing === 'number' ? float(dSpacing) : dSpacing
  const lambda = latticeNormal.dot(halfVector).clamp().mul(spacing)
  const redGate = lambda.sub(0.65).abs().mul(-sharpness).exp()
  const greenGate = lambda.sub(0.53).abs().mul(-sharpness).exp()
  const blueGate = lambda.sub(0.44).abs().mul(-sharpness).exp()
  return color('#ff1838').mul(redGate)
    .add(color('#15f060').mul(greenGate))
    .add(color('#2878ff').mul(blueGate))
}
