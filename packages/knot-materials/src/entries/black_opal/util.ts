import type {Node} from 'three/webgpu'

import {
  float,
  mix,
  mx_cell_noise_float,
  mx_noise_vec3,
  vec3,
} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'

/**
 * Analytical spectral color mapping for diffracted wavelengths (400 nm to 700 nm).
 * Produces pure, laser-saturated monochromatic interference colors.
 */
export function wavelengthToRGB(wavelengthNm: Node<'float'>) {
  // Normalized visible spectrum parameter [0, 1]
  const t = wavelengthNm.sub(400).div(300).clamp()
  const violet = vec3(0.55, 0, 1)
  const cobalt = vec3(0, 0.25, 1)
  const cyan = vec3(0, 0.95, 1)
  const emerald = vec3(0, 1, 0.25)
  const yellowGold = vec3(1, 0.85, 0)
  const flameOrange = vec3(1, 0.38, 0)
  const laserRed = vec3(1, 0, 0.12)
  return mix(
    violet,
    mix(
      cobalt,
      mix(
        cyan,
        mix(
          emerald,
          mix(
            yellowGold,
            mix(flameOrange, laserRed, t.smoothstep(0.82, 1)),
            t.smoothstep(0.65, 0.82),
          ),
          t.smoothstep(0.48, 0.65),
        ),
        t.smoothstep(0.32, 0.48),
      ),
      t.smoothstep(0.16, 0.32),
    ),
    t.smoothstep(0, 0.16),
  )
}

/**
 * Evaluates a volumetric Bragg diffraction stratum of precious black opal.
 */
export function opalDiffractionStratum(
  pInternal: Node<'vec3'>,
  halfA: Node<'vec3'>,
  halfB: Node<'vec3'>,
  halfC: Node<'vec3'>,
  scale: number,
  depthAbsorption: number,
) {
  // Domain-warp coordinates with FBM to break any Cartesian grid alignment
  const warp = mx_noise_vec3(pInternal.mul(scale * 0.4)).mul(0.35)
  const coord = pInternal.mul(scale).add(warp)
  const cell = coord.floor()
  // Random 3D orientation vector for the silica sphere stack in this grain
  const latticeNormal = cellNoiseVec3(cell).mul(2).sub(1).normalize()
  const cellNoise = mx_cell_noise_float(cell.add(vec3(31.7, 12.4, 85.1)))
  const sphereSpacing = cellNoise.mul(130).add(170) // 170 nm to 300 nm sphere arrays
  // Angular Bragg alignment across three studio lamps
  const alignA = latticeNormal.dot(halfA).abs()
  const alignB = latticeNormal.dot(halfB).abs()
  const alignC = latticeNormal.dot(halfC).abs()
  const maxAlign = alignA.max(alignB).max(alignC)
  // Narrow angular extinction: 70%+ of the stone remains pitch-black N1 body tone
  const flashLobe = maxAlign.smoothstep(0.72, 0.98).pow(3)
  // Diffracted wavelength: lambda = 2 * d * cos(theta)
  const lambda = sphereSpacing.mul(2 * 1.45).mul(maxAlign)
  const spectralColor = wavelengthToRGB(lambda)
  // Beer-Lambert volume absorption through smoky potch
  return spectralColor.mul(flashLobe).mul(float(depthAbsorption))
}
