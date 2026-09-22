import type {Node} from 'three/webgpu'

import {mx_noise_float, vec2} from 'three/tsl'

/** Spun silk: near-parallel strands wandering across the tube. `cord` is derivative-free for vertex use. */
export function silk(tile: Node<'vec2'>) {
  const sway = mx_noise_float(vec2(tile.x.mul(2.2), tile.x.mul(0.4)).add(0.5)).mul(0.16)
  const threads = tile.y.add(sway).mul(34)
  const strand = threads.fract().sub(0.5).abs().div(0.5)
  const twist = threads.sin().mul(0.5).add(0.5)
  const cord = strand.pow(2).oneMinus().clamp(0, 1)
  const footprint = threads.fwidth().abs().max(0.0001)
  const fine = footprint.mul(3).smoothstep(0.5, 1.4).oneMinus().mul(0.75).add(0.25)
  return {
    cord,
    mask: cord.mul(fine),
    sheen: twist,
    warp: sway,
  }
}
