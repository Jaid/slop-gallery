import type {Node} from 'three/webgpu'

import {color, float, mix, mx_atan2, mx_fractal_noise_float, select, time, vec3} from 'three/tsl'

// The accretion disk is evaluated by actually intersecting the escaping ray with the equatorial
// plane, so it has a real inner edge, a real Keplerian temperature gradient, and a real Doppler
// asymmetry. The turbulence is sampled in the co-rotating frame with omega ∝ r^-3/2, which shears
// the inner rings away from the outer ones exactly as a real disk does.
export function accretionDisk(origin: Node<'vec3'>, ray: Node<'vec3'>, toEye: Node<'vec3'>, detail: Node<'float'>) {
  const denom = ray.y
  const travel = origin.y.negate().div(select(denom.abs().lessThan(0.006), float(0.006), denom))
  const hit = origin.add(ray.mul(travel))
  const radius = hit.length()
  const front = travel.smoothstep(0, 0.03)
  const annulus = radius.smoothstep(0.3, 0.42).mul(radius.smoothstep(2.3, 1.45))
  const azimuth = mx_atan2(hit.z, hit.x.add(0.000001)) as unknown as Node<'float'>
  const omega = float(1.25).div(radius.pow(1.5).max(0.3))
  const shear = azimuth.sub(time.mul(omega))
  const swirl = vec3(shear.cos().mul(radius), shear.sin().mul(radius), 0).mul(5.4)
  const coarse = mx_fractal_noise_float(swirl, 4, 2.1, 0.55).mul(0.5).add(0.5)
  const fine = mx_fractal_noise_float(swirl.mul(3.2).add(vec3(11.3, 0, 4.7)), 3, 2.2, 0.5).mul(0.5).add(0.5)
  const turbulence = coarse.mul(0.62).add(fine.mul(detail.mul(0.6).add(0.4)).mul(0.38))
  const temperature = radius.reciprocal().pow(0.72)
  const hue = mix(color('#ff3606'), mix(color('#ffc271'), color('#d8ecff'), temperature.smoothstep(0.8, 1.7)), temperature.smoothstep(0.28, 1.05))
// Relativistic beaming: the side of the disk sweeping toward the eye is far brighter and bluer.
  const orbit = vec3(hit.z, 0, hit.x.negate()).normalize()
  const beta = float(0.44).div(radius.sqrt().max(0.52))
  const doppler = float(1).add(beta.mul(orbit.dot(toEye))).max(0.16)
  const tint = hue.add(color('#a6d8ff').mul(doppler.sub(1).max(0).mul(0.5)))
  const density = annulus.mul(front).mul(turbulence.mul(0.55).add(0.55))
  const halo = radius.smoothstep(0.24, 0.55).mul(radius.smoothstep(3.6, 0.9)).mul(front).mul(0.16)
  return {
    density,
    emission: tint.mul(density).mul(doppler.pow(2.7)).mul(3),
    halo: tint.mul(halo),
  }
}
