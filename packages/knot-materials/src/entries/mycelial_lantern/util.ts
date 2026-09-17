import type {Node} from 'three/webgpu'

import {mx_noise_float, vec3} from 'three/tsl'

import {filament} from '../../candidates/gpt_sol/lib/filament.ts'

export function hyphae(q: Node<'vec3'>, seed: number) {
  const offset = vec3(seed * 4.7, seed * -7.1, seed * 2.9)
  const guide = mx_noise_float(q.mul(3.2).add(offset))
  const trunkField = mx_noise_float(q.mul(10.5)
    .add(offset.mul(1.7))
    .add(guide.mul(2.25)))
  const hairField = mx_noise_float(q.mul(24)
    .sub(offset)
    .add(trunkField.mul(1.7)))
  const territory = guide
    .abs()
    .smoothstep(0.12, 0.68)
    .oneMinus()
  const trunks = filament(trunkField.add(guide.mul(0.28)), 0.029)
  const hairs = filament(hairField.add(trunkField.mul(0.24)), 0.018)
  return trunks
    .mul(territory.mul(0.4).add(0.7))
    .add(hairs.mul(territory).mul(0.65))
    .clamp()
}
