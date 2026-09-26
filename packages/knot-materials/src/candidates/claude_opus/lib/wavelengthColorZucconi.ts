import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

/**
 * Visible-spectrum color for a wavelength in nanometers (≈400–700), in linear light.
 * Six-lobe fit by Alan Zucconi; zero outside the visible range.
 */
export function wavelengthColor(nanometers: Node<'float'>) {
  const x = nanometers.sub(400).div(300).clamp()
  const lobe = (scale: [number, number, number], offset: [number, number, number], floor: [number, number, number]) => {
    const t = vec3(...scale).mul(x.sub(vec3(...offset)))
    return t.mul(t).oneMinus().sub(vec3(...floor)).clamp()
  }
  const srgb = lobe([3.54585104, 2.93225262, 2.41593945], [0.69549072, 0.49228336, 0.2769988], [0.02312639, 0.15225084, 0.52607955])
    .add(lobe([3.9030714, 3.21182957, 3.96587128], [0.11748627, 0.86755042, 0.6607786], [0.8489713, 0.88445281, 0.73949448]))
  return srgb.clamp().pow(2.2)
}
