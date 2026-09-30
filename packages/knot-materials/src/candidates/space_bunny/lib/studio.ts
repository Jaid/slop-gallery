import type {Node} from 'three/webgpu'

import {asin, mx_atan2, positionWorldDirection, vec2, vec3} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'

/** Equirectangular coordinates of a world direction, matching the gallery's studio panorama. */
export const studioEquirect = (direction: Node<'vec3'>) => {
  const d = direction.normalize()
  const azimuth = mx_atan2(d.z, d.x) as unknown as Node<'float'>
  return vec2(azimuth.mul(1 / TAU).add(0.5), asin(d.y.clamp(-1, 1)).div(Math.PI).add(0.5))
}
/**
 * The gallery studio, evaluated analytically along an arbitrary ray. Sharper and cheaper than reading
 * the float panorama back - which cannot be linearly filtered on most devices and turns blocky - and
 * perfect for the sharp bent rays of a refracting body.
 */
export function studioRadiance(direction: Node<'vec3'> = positionWorldDirection) {
  const uv = studioEquirect(direction)
  const warm = softBox(uv, vec2(0.2, 0.28), vec2(0.115, 0.16)).mul(3.2)
  const cool = softBox(uv, vec2(0.62, 0.4), vec2(0.035, 0.2)).mul(3.8)
  const fill = softBox(uv, vec2(0.82, 0.24), vec2(0.13, 0.12)).mul(1.8)
  const base = uv.y.oneMinus().pow(1.5).mul(0.25).add(0.12)
  return vec3(base.add(warm.add(cool.mul(0.85)).add(fill)), base.add(warm.mul(0.9).add(cool.mul(0.94)).add(fill)), base.add(warm.mul(0.88).add(cool).add(fill)))
}
/** A soft box: a super-Gaussian rectangle in panorama space, seamless around the azimuth. */
function softBox(uv: Node<'vec2'>, center: Node<'vec2'>, halfSize: Node<'vec2'>) {
  const delta = uv.sub(center)
  const u = delta.x.abs().min(delta.x.abs().oneMinus()).div(halfSize.x)
  // GPU pow is undefined for negative bases, even with an even integer exponent.
  return u.pow2().pow2().add(delta.y.div(halfSize.y).pow2().pow2()).negate().exp()
}
