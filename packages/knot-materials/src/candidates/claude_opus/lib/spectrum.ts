import type {Node} from 'three/webgpu'

import {float, vec3} from 'three/tsl'

/** CIE 1931 XYZ color matching for a wavelength in nanometers. */
export function wavelengthToXyz(wavelength: Node<'float'>) {
  const x = lobe(wavelength, 599.8, 37.9, 31).mul(1.056).add(lobe(wavelength, 442, 16, 26.7).mul(0.362)).sub(lobe(wavelength, 501.1, 20.4, 26.2).mul(0.065))
  const y = lobe(wavelength, 568.8, 46.9, 40.5).mul(0.821).add(lobe(wavelength, 530.9, 16.3, 31.1).mul(0.286))
  const z = lobe(wavelength, 437, 11.8, 36).mul(1.217).add(lobe(wavelength, 459, 26, 13.8).mul(0.681))
  return vec3(x, y, z)
}
/** Linear Rec. 709 color of monochromatic light; out-of-gamut negatives are clipped. */
export function wavelengthToRgb(wavelength: Node<'float'>) {
  const xyz = wavelengthToXyz(wavelength)
  return vec3(xyz.dot(vec3(3.2406, -1.5372, -0.4986)), xyz.dot(vec3(-0.9689, 1.8758, 0.0415)), xyz.dot(vec3(0.0557, -0.204, 1.057))).max(0)
}
/**
 * Relative blackbody radiance in linear RGB, sampled from Planck’s law at representative primaries.
 * Normalized so the red channel of a 1400 K body is 1 – color and brightness rise together, as they do in molten rock.
 */
export function blackbody(kelvin: Node<'float'>) {
  const c2 = 1.4388e7
// Wien’s approximation in ratio form avoids the tiny absolute values of Planck’s law in fp32.
  const reference = c2 / (610 * 1400)
  const channel = (nanometers: number) => float(reference).sub(float(c2 / nanometers).div(kelvin)).min(30).exp().mul((nanometers / 610) ** -5)
  return vec3(channel(610), channel(549), channel(465))
}
/** Asymmetric Gaussian lobe used by Wyman, Sloan and Shirley’s analytic CIE 1931 fit. */
function lobe(wavelength: Node<'float'>, mean: number, below: number, above: number) {
  const offset = wavelength.sub(mean)
  const width = offset.lessThan(0).select(float(below), float(above))
  return offset.div(width).pow2().mul(-0.5).exp()
}
