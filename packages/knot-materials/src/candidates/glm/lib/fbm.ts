import type {Node} from 'three/webgpu'

import {mx_noise_float} from 'three/tsl'

export function fbm(position: Node<'vec3'>, octaves = 3, lacunarity = 2.03, gain = 0.55): Node<'float'> {
  let sum: Node<'float'> | null = null
  let amplitude = 1
  let frequency = 1
  let norm = 0
  for (let octave = 0; octave < octaves; octave++) {
    const layer = mx_noise_float(position.mul(frequency)).mul(amplitude)
    sum = sum === null ? layer : sum.add(layer)
    norm += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }
  return sum!.div(norm)
}
