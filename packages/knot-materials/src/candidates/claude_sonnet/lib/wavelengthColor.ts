import type {Node} from 'three/webgpu'

import {float, select, vec3} from 'three/tsl'

const lobe = (x: Node<'float'>, mean: number, low: number, high: number) => {
  const offset = x.sub(mean)
  const sigma = select(offset.lessThan(0), float(low), float(high))
  return offset.div(sigma).pow2().mul(-0.5).exp()
}
/** Linear-light color of a single visible wavelength (nanometers), from the multi-lobe CIE 1931 fit of Wyman et al. Output is gamut-clipped, rescaled to a constant peak and faded beyond 400–700 nm, so diffraction and Bragg colors stay vivid instead of sinking into the violet. */
export function wavelengthColor(nanometers: Node<'float'>) {
  const l = nanometers
  const x = lobe(l, 599.8, 37.9, 31).mul(1.056).add(lobe(l, 442, 16, 26.7).mul(0.362)).sub(lobe(l, 501.1, 20.4, 26.2).mul(0.065))
  const y = lobe(l, 568.8, 46.9, 40.5).mul(0.821).add(lobe(l, 530.9, 16.3, 31.1).mul(0.286))
  const z = lobe(l, 437, 11.8, 36).mul(1.217).add(lobe(l, 459, 26, 13.8).mul(0.681))
  const rgb = vec3(x.mul(3.2406).sub(y.mul(1.5372)).sub(z.mul(0.4986)), x.mul(-0.9689).add(y.mul(1.8758)).add(z.mul(0.0415)), x.mul(0.0557).sub(y.mul(0.204)).add(z.mul(1.057))).max(0)
  const peak = rgb.x.max(rgb.y).max(rgb.z).max(0.0001)
  const fade = l.smoothstep(372, 420).mul(l.smoothstep(680, 735).oneMinus())
  return rgb.div(peak).mul(fade)
}
