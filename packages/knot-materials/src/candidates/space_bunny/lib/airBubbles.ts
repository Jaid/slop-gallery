import type {Node} from 'three/webgpu'

import {mx_noise_float, vec3} from 'three/tsl'

/**
 * Air frozen inside a clear solid. Each cell holds one sphere that never crosses its own cell walls.
 * The returned terms shade it the way a real void reads in resin: nothing in the middle, where you
 * simply see through, a hard bright ring at the edge where total internal reflection gathers, and one
 * small glint on the crown.
 */
export function airBubbles(position: Node<'vec3'>, scale: number, seed: Node<'float'> | number = 0) {
  const space = position.mul(scale)
  const cell = space.floor()
  const random = vec3(mx_noise_float(cell.add(seed)), mx_noise_float(cell.add(seed).add(17.3)), mx_noise_float(cell.add(seed).add(41.9))).mul(0.5).add(0.5)
  const centre = random.mul(0.5).add(0.25)
  const distance = space.fract().sub(centre).length()
  const radius = random.z.mul(0.2).add(0.14)
  const gate = random.y.smoothstep(0.46, 0.6)
  const footprint = distance.fwidth().max(0.002)
  const body = distance.smoothstep(radius.add(footprint.mul(2)), radius.sub(footprint.mul(2))).mul(gate)
  const dome = distance.div(radius.max(0.001)).pow2().oneMinus().clamp(0, 1)
  return {
    body,
    crown: body.mul(dome.pow(9)),
    dome,
    radius,
    rim: body.mul(dome.oneMinus().pow(1.5)),
  }
}
