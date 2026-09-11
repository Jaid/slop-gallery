import type {Node} from 'three/webgpu'

import {mx_noise_float, mx_noise_vec3, negateOnBackSide, normalViewGeometry, positionView, time, vec3} from 'three/tsl'

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

export const hash1 = (lattice: Node<'vec3'>) => mx_noise_float(lattice)

export const hash3 = (lattice: Node<'vec3'>) => mx_noise_vec3(lattice)

export function heartbeat(rate: number): Node<'float'> {
  const phase = time.mul(rate).fract()
  const spike = (at: number, sharpness: number) => phase.sub(at).abs().mul(sharpness).oneMinus().clamp().pow(3)
  return spike(0.06, 9).add(spike(0.32, 12).mul(0.6)).clamp()
}

export function starGlints(field: Node<'vec3'>, view: Node<'vec3'>, sharpness = 22): Node<'float'> {
  const a = hash3(field)
  const b = hash3(field.add(vec3(19.7, 7.3, 3.1)))
  const phase = time.mul(0.3).fract().mul(2).oneMinus().abs()
  const direction = a.mul(phase).add(b.mul(phase.oneMinus())).add(vec3(0.017, 0.005, 0.011)).normalize()
  return view.dot(direction).clamp().pow(sharpness)
}

export function spectralColor(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.46).add(0.54)
}

export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus().mul(footprint.smoothstep(width * 3, width * 12).oneMinus())
}

export function proceduralNormal(height: Node<'float'>, strength: number) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const normal = normalViewGeometry
  const rx = dy.cross(normal)
  const ry = normal.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy())).mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return negateOnBackSide(normal.sub(gradient.mul(strength)).normalize())
}
