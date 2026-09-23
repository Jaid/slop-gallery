import type {Node} from 'three/webgpu'

import {float, vec3} from 'three/tsl'

/** Multi-lobe Gaussian fit of the CIE 1931 observer, from Wyman, Sloan and Shirley, JCGT 2013. */
const gaussian = (x: Node<'float'>, centre: number, sigmaLow: number, sigmaHigh: number) => {
  const sigma = x.lessThan(centre).select(float(sigmaLow), float(sigmaHigh))
  const t = x.sub(centre).div(sigma)
  return t.mul(t).mul(-0.5).exp()
}
/** Linear sRGB of one nanometre-wide spectral line, out-of-gamut lobes clamped to zero. */
export function spectralRGB(wavelength: Node<'float'>) {
  const λ = wavelength
  const x = gaussian(λ, 599.8, 37.9, 31).mul(1.056).add(gaussian(λ, 442, 16, 26.7).mul(0.362)).sub(gaussian(λ, 501.1, 20.4, 26.2).mul(0.065))
  const y = gaussian(λ, 568.8, 46.9, 40.5).mul(0.821).add(gaussian(λ, 530.9, 16.3, 31.1).mul(0.286))
  const z = gaussian(λ, 437, 11.8, 36).mul(1.217).add(gaussian(λ, 459, 26, 13.8).mul(0.681))
  const xyz = vec3(x, y, z)
  const rgb = vec3(vec3(3.2404542, -1.5371385, -0.4985314).dot(xyz), vec3(-0.969266, 1.8760108, 0.041556).dot(xyz), vec3(0.0556434, -0.2040259, 1.0572252).dot(xyz))
  return rgb.max(vec3(0))
}
/** The same color scaled so its strongest channel is one, for use as a hue carrier. */
export function spectralHue(wavelength: Node<'float'>) {
  const rgb = spectralRGB(wavelength)
  return rgb.div(rgb.x.max(rgb.y).max(rgb.z).max(0.001))
}
/** Eye sensitivity window for diffraction orders, softly closing at both ends of the visible band. */
export function visibleWindow(wavelength: Node<'float'>) {
  return wavelength.smoothstep(392, 432).mul(wavelength.smoothstep(648, 690).oneMinus())
}
