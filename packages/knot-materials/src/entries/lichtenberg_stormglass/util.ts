import type {Node} from 'three/webgpu'

import {mx_noise_float, mx_noise_vec3, vec3} from 'three/tsl'

export function lichtenberg(p: Node<'vec3'>, t: Node<'float'>) {
  const drift = vec3(t.mul(0.06), t.mul(-0.035), t.mul(0.048))
  const warp = mx_noise_vec3(p.mul(2.15).add(drift))
  const q = p.mul(3.4).add(warp.mul(0.92))
  const trunkField = mx_noise_float(q)
  const branchField = mx_noise_float(q.mul(2.35).add(warp.mul(1.25)))
  const hairField = mx_noise_float(q.mul(5.8).sub(drift.mul(2)))
  return {
    trunk: trunkField.abs().smoothstep(0.11, 0).pow(1.35),
    branch: branchField.abs().smoothstep(0.075, 0).pow(1.7),
    hair: hairField.abs().smoothstep(0.045, 0).pow(2.1),
    field: trunkField,
  }
}
