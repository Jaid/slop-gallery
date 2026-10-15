import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

/** Second radiation constant c₂ = hc/k in nanometer-kelvin. */
const c2 = 1.4388e7
const planck = (nanometers: number, kelvin: Node<'float'>) => kelvin.mul(nanometers).reciprocal().mul(c2).exp().sub(1).reciprocal().mul((600 / nanometers) ** 5)
/**
 * Chromaticity of a black body at `kelvin`, from Planck’s law sampled at representative red, green and blue wavelengths
 * and normalized to unit luminance. Pair it with an intensity curve of your own: the true radiance spans many orders of
 * magnitude between a dull red and a yellow-white glow.
 */
export function blackbodyColor(kelvin: Node<'float'>) {
  const t = kelvin.max(500)
  const rgb = vec3(planck(610, t), planck(549, t), planck(465, t))
  return rgb.div(rgb.dot(vec3(0.2126, 0.7152, 0.0722)).max(1e-30))
}
