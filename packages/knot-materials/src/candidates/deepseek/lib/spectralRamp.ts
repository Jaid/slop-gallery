import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

/**
 * A linear-light spectrum sampled at `band` ∈ [0, 1], violet through blue, green, amber and red, as
 * a sum of narrow bands. `spread` widens every band, turning a prism line into a soft wash.
 */
const bands: Array<[number, number, number, number, number]> = [
  [0.02, 0.1, 0.55, 0.05, 1],
  [0.22, 0.11, 0.04, 0.36, 1],
  [0.45, 0.13, 0.05, 1, 0.3],
  [0.7, 0.15, 1, 0.68, 0.04],
  [0.92, 0.18, 1, 0.03, 0.03],
]
export function spectralRamp(band: Node<'float'>, spread = 1) {
  let spectrum: Node<'vec3'> = vec3(0)
  for (const [center, width, red, green, blue] of bands) {
    const offset = band.sub(center).div(width * spread)
    spectrum = spectrum.add(vec3(red, green, blue).mul(offset.mul(offset).negate().exp()))
  }
  return spectrum
}
