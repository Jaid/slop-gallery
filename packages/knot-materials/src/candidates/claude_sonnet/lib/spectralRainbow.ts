import type {Node} from 'three/webgpu'

import {float, Fn, select, vec3} from 'three/tsl'

/** Asymmetric Gaussian lobe of the Wyman–Sloan–Shirley CIE 1931 fit. */
const lobe = (lambda: Node<'float'>, mu: number, sigmaLow: number, sigmaHigh: number) => {
  const sigma = select(lambda.lessThan(mu), float(sigmaLow), float(sigmaHigh))
  return lambda.sub(mu).div(sigma).pow2().mul(-0.5).exp()
}

/** Pure spectral color of a wavelength in nanometers (≈ 380–720), as linear sRGB scaled so its brightest channel is 1. Out-of-gamut negative lobes are clipped, which keeps the hues vivid. */
export const wavelengthColor = Fn(([lambda]: [Node<'float'>]) => {
  const x = lobe(lambda, 599.8, 37.9, 31).mul(1.056)
    .add(lobe(lambda, 442, 16, 26.7).mul(0.362))
    .sub(lobe(lambda, 501.1, 20.4, 26.2).mul(0.065))
  const y = lobe(lambda, 568.8, 46.9, 40.5).mul(0.821).add(lobe(lambda, 530.9, 16.3, 31.1).mul(0.286))
  const z = lobe(lambda, 437, 11.8, 36).mul(1.217).add(lobe(lambda, 459, 26, 13.8).mul(0.681))
  const rgb = vec3(
    x.mul(3.2404542).sub(y.mul(1.5371385)).sub(z.mul(0.4985314)),
    x.mul(-0.969266).add(y.mul(1.8760108)).add(z.mul(0.041556)),
    x.mul(0.0556434).sub(y.mul(0.2040259)).add(z.mul(1.0572252)),
  ).max(0)
  return rgb.div(rgb.x.max(rgb.y).max(rgb.z).max(0.0001))
})

/** Blue (0) → orange-red (1) rainbow built from {@link wavelengthColor}; it skips the dim violet and deep-red ends. */
export const rainbow = Fn(([t]: [Node<'float'>]) => wavelengthColor(t.clamp(0, 1).mul(210).add(440)))
