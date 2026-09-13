import type {Node} from 'three/webgpu'

import {mx_cell_noise_float, mx_worley_noise_vec3} from 'three/tsl'

import cellNoiseVec3 from './cellNoise.ts'

/** Euclidean feature distances, not the piecewise-constant MaterialX cell hash. */
export function cellularBoundary(position: Node<'vec3'>) {
  const distances = mx_worley_noise_vec3(position, 1, 0)
  return distances.y.sub(distances.x)
}

/**
 * Round inclusions with stable per-feature activation. Centers stay >= 0.25
 * from every cell face; support <= 0.24 therefore vanishes before ownership
 * changes. Neighbor searches are unnecessary for these contained spheres.
 * Do not expand the support for antialiasing or use identity outside the mask.
 */
export function cellularPoints(position: Node<'vec3'>, inner = 0.06, outer = 0.22, threshold = 0.5) {
  if (!(inner >= 0 && inner < outer && outer <= 0.24 && threshold >= 0 && threshold < 1)) {
    throw new RangeError('Invalid cellular point support or activation threshold.')
  }
  const cell = position.floor()
  const center = cellNoiseVec3(cell).mul(0.5).add(0.25)
  const distance = position.fract().sub(center).length()
  const identity = mx_cell_noise_float(cell)
  const core = distance.smoothstep(inner, outer).oneMinus()
  return core.mul(identity.smoothstep(threshold, Math.min(threshold + 0.1, 1)))
}
