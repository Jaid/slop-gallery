import type {Node} from 'three/webgpu'

import {float, vec3} from 'three/tsl'

const lobe = (wavelength: Node<'float'>, mean: number, below: number, above: number) => {
  const offset = wavelength.sub(mean)
  const sigma = offset.lessThan(0).select(float(below), float(above))
  return offset.div(sigma).pow2().mul(-0.5).exp()
}
/**
 * Linear sRGB of monochromatic light, from the Wyman–Sloan–Shirley multi-lobe fit of the CIE 1931 observer.
 * Out-of-gamut negatives are clipped; peak luminance is roughly 1 near 555 nm.
 */
export function wavelengthColor(nanometers: Node<'float'> | number) {
  const wavelength = typeof nanometers === 'number' ? float(nanometers) : nanometers
  const x = lobe(wavelength, 599.8, 37.9, 31).mul(1.056).add(lobe(wavelength, 442, 16, 26.7).mul(0.362)).sub(lobe(wavelength, 501.1, 20.4, 26.2).mul(0.065))
  const y = lobe(wavelength, 568.8, 46.9, 40.5).mul(0.821).add(lobe(wavelength, 530.9, 16.3, 31.1).mul(0.286))
  const z = lobe(wavelength, 437, 11.8, 36).mul(1.217).add(lobe(wavelength, 459, 26, 13.8).mul(0.681))
  return vec3(x.mul(3.2406).sub(y.mul(1.5372)).sub(z.mul(0.4986)), x.mul(-0.9689).add(y.mul(1.8758)).add(z.mul(0.0415)), x.mul(0.0557).sub(y.mul(0.204)).add(z.mul(1.057))).max(0)
}
