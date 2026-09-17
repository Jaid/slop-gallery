import type {Node} from 'three/webgpu'

import {mx_fractal_noise_float, mx_noise_float, vec3} from 'three/tsl'

export function dendriticField(p: Node<'vec3'>, scale: number) {
  const warp = mx_fractal_noise_float(p.mul(scale * 0.55), 3, 2, 0.55).mul(0.85)
  const branch = mx_noise_float(p.mul(scale).add(vec3(warp, warp.mul(-0.6), warp.mul(0.4))))
  const vein = mx_noise_float(p.mul(scale * 2.4).add(vec3(3.1, warp.mul(2), -1.7)))
  return branch.mul(0.65).add(vein.mul(0.35))
}
