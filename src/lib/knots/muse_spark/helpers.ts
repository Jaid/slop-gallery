import type {Node} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {cameraPosition, color, float, mix, modelWorldMatrixInverse, negateOnBackSide, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

export function spectralColor(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.46).add(0.54)
}

export function filament(field: Node<'float'>, width: number) {
  return field.abs().smoothstep(width, field.fwidth().mul(1.2).max(0.0001).add(width)).oneMinus()
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

export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus().mul(footprint.smoothstep(width * 3, width * 12).oneMinus())
}

export function opticalBands(phase: Node<'float'>) {
  const visibility = phase.fwidth().smoothstep(0.6, 3).oneMinus()
  return phase.cos().mul(visibility).mul(0.5).add(0.5)
}

export function viewerFrame() {
  const p = positionGeometry
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const view = cameraLocal.sub(p).normalize()
  const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
  const grazing = facing.oneMinus()
  const distance = positionView.length()
  return {
    p,
    cameraLocal,
    view,
    facing,
    grazing,
    rim: grazing.abs().pow(2),
    distance,
    near: distance.smoothstep(1.25, 5.5).oneMinus(),
    intimate: distance.smoothstep(0.8, 2.7).oneMinus(),
  }
}

export const cellNoiseVec3 = (tsl as typeof tsl & {
  mx_cell_noise_vec3: (position: Node<'vec3'>) => Node<'vec3'>
}).mx_cell_noise_vec3

export type Triple = [number, number, number]

export function starfield(direction: Node<'vec3'>, scale: number, threshold: number) {
  const q = direction.mul(scale)
  const rnd = cellNoiseVec3(q)
  const rnd2 = cellNoiseVec3(q.add(31.7))
  const centre = rnd.mul(0.6).add(0.2)
  const dist = q.fract().sub(centre).length()
  const footprint = q.fwidth().length().max(0.001)
  const radius = footprint.mul(0.9).max(0.06)
  const core = dist.smoothstep(0, radius).oneMinus()
  const gate = rnd2.x.smoothstep(threshold, threshold + 0.01)
  const twinkle = time.mul(rnd2.y.mul(4).add(1.5)).add(rnd2.z.mul(30)).sin().mul(0.35).add(0.75)
  const tint = mix(color('#ffd9b0'), color('#b8d4ff'), rnd2.z)
  const energy = footprint.smoothstep(0.3, 1.2).oneMinus()
  return tint.mul(core.abs().pow(2)).mul(gate).mul(twinkle).mul(energy)
}

export function cosinePalette(t: Node<'float'>, bias: Triple, amplitude: Triple, frequency: Triple, phase: Triple) {
  return vec3(...bias).add(vec3(...amplitude).mul(vec3(...frequency).mul(t).add(vec3(...phase)).mul(Math.PI * 2).cos()))
}

export function glints(normal: Node<'vec3'>, sharpness: number) {
  const lamps = [vec3(0.35, 0.78, 0.52), vec3(-0.62, 0.28, 0.73), vec3(0.1, -0.35, 0.93)]
  let sum: Node<'float'> = float(0)
  for (const lamp of lamps) {
    const half = lamp.normalize().add(positionViewDirection).normalize()
    sum = sum.add(normal.dot(half).clamp().pow(sharpness))
  }
  return sum
}
