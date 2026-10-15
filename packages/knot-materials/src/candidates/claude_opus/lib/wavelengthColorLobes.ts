import type {Node} from 'three/webgpu'

import {float, select, vec3} from 'three/tsl'

/**
 * Linear-sRGB color of a pure spectral line in nanometers, through an analytic CIE 1931 fit and the XYZ → sRGB matrix.
 * Spectral colors lie outside sRGB, so negative lobes are clipped; channels reach about 2.4 (orange-red) and 1.9 (violet-blue) and fade to black outside 400–700 nm.
 */
export function wavelengthColor(lambda: Node<'float'>) {
  const x = lobe(lambda, 599.8, 37.9, 31).mul(1.056).add(lobe(lambda, 442, 16, 26.7).mul(0.362)).sub(lobe(lambda, 501.1, 20.4, 26.2).mul(0.065))
  const y = lobe(lambda, 568.8, 46.9, 40.5).mul(0.821).add(lobe(lambda, 530.9, 16.3, 31.1).mul(0.286))
  const z = lobe(lambda, 437, 11.8, 36).mul(1.217).add(lobe(lambda, 459, 26, 13.8).mul(0.681))
  return vec3(x.mul(3.2406).sub(y.mul(1.5372)).sub(z.mul(0.4986)), x.mul(-0.9689).add(y.mul(1.8758)).add(z.mul(0.0415)), x.mul(0.0557).sub(y.mul(0.204)).add(z.mul(1.057))).max(0)
}
/**
 * The hue of a spectral line at a uniform peak channel of 1, so diffraction art can give red, green and violet equal presence.
 * Fades to black at the borders of vision (400–430 nm and 660–710 nm) instead of clipping.
 */
export function spectralHue(lambda: Node<'float'>) {
  const raw = wavelengthColor(lambda)
  const peak = raw.x.max(raw.y).max(raw.z).max(0.0001)
  const envelope = lambda.smoothstep(400, 430).mul(lambda.smoothstep(660, 710).oneMinus())
  return raw.div(peak).mul(envelope)
}
/** Asymmetric Gaussian lobe of the Wyman–Sloan–Shirley CIE 1931 fit. */
function lobe(lambda: Node<'float'>, mean: number, below: number, above: number) {
  const offset = lambda.sub(mean)
  const width = select(offset.lessThan(0), float(below), float(above))
  return offset.div(width).pow2().mul(-0.5).exp()
}
