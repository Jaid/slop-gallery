import type {Node} from 'three/webgpu'

import {mx_noise_float, vec3} from 'three/tsl'

import {filament} from '../../candidates/gpt_sol/lib/filament.ts'

export function iceFracture(q: Node<'vec3'>, seed: number, detail: number) {
  const offset = vec3(seed * 7.13, seed * -3.71, seed * 5.47)
  const direction = vec3(0.31 + seed * 0.07, 0.87 - seed * 0.04, -0.36 + seed * 0.03).normalize()
  const guide = mx_noise_float(q.mul(4.1).add(offset))
  const shard = mx_noise_float(q.mul(detail)
    .add(offset.mul(2.7))
    .add(guide.mul(2.1)))
  const fork = mx_noise_float(q.mul(detail * 1.65)
    .sub(offset)
    .add(shard.mul(1.4)))
  const territory = guide
    .abs()
    .smoothstep(0.16, 0.72)
    .oneMinus()
  const trunk = filament(shard.add(guide.mul(0.32)), 0.025)
  const twigs = filament(fork.add(shard.mul(0.2)), 0.018)
  const crystalPlane = filament(q.dot(direction)
    .mul(detail * 0.78)
    .add(guide.mul(2.4))
    .sin(), 0.035)
  return trunk
    .mul(territory.mul(0.45).add(0.75))
    .add(twigs.mul(territory).mul(0.7))
    .add(crystalPlane.mul(territory).mul(0.22))
    .clamp()
}
