import type {Node} from 'three/webgpu'

import {float, mx_noise_float, vec3} from 'three/tsl'

/**
 * Value-noise fBm. Octaves are unrolled; lacunarity and gain stay modest so distant views stay smooth.
 */
export function fractalNoise(position: Node<'vec3'>, octaves = 4, lacunarity = 2.03, gain = 0.5) {
  let amplitude = 1
  let frequency = 1
  let sum: Node<'float'> = float(0)
  let weight = 0
  for (let octave = 0;octave < octaves;octave++) {
    sum = sum.add(mx_noise_float(position.mul(frequency)).mul(amplitude))
    weight += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }
  return sum.div(weight)
}
/**
 * Ridged fBm: sharp crests, soft valleys, and a little domain warp from the previous octave.
 */
export function ridgedNoise(position: Node<'vec3'>, octaves = 4, lacunarity = 2.07, gain = 0.5) {
  let amplitude = 1
  let frequency = 1
  let sum: Node<'float'> = float(0)
  let weight = 0
  let warp: Node<'float'> = float(0)
  for (let octave = 0;octave < octaves;octave++) {
    const sample = mx_noise_float(position.mul(frequency).add(vec3(warp.mul(0.35), 0, 0)))
    const ridge = sample.abs().oneMinus()
    sum = sum.add(ridge.mul(ridge).mul(amplitude))
    warp = warp.add(sample)
    weight += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }
  return sum.div(weight)
}
