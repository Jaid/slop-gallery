import type {Node} from 'three/webgpu'

import {float, mx_fractal_noise_float, mx_noise_float, vec3} from 'three/tsl'

/** One aurora curtain: noise combed into vertical filaments, folded by slow drift, with a soft lower hem. */
export function curtain(point: Node<'vec3'>, seed: Node<'float'> | number) {
  const s = typeof seed === 'number' ? float(seed) : seed
  const s3 = vec3(s, s.mul(1.7), s.mul(0.4))
  const drift = mx_fractal_noise_float(vec3(point.x.mul(2.5), point.z.mul(2.5), point.y.mul(0.4)).add(s3), 3, 2, 0.5).mul(0.22)
  const combed = mx_fractal_noise_float(vec3(point.x.add(drift).mul(48), point.y.mul(1.1), point.z.add(drift).mul(48)).add(s3), 4, 2, 0.55)
  const ray = combed.mul(0.5).add(0.5).pow(3)
  const hem = point.y.smoothstep(-0.62, -0.05).mul(point.y.smoothstep(0.2, 0.62).oneMinus())
  const shimmer = mx_noise_float(vec3(point.x.mul(8), point.z.mul(8), point.y.mul(0.5)).add(s3)).mul(0.3).add(0.7)
  return {
    fade: hem.mul(shimmer),
    ray,
  }
}
