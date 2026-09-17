import type {Node} from 'three/webgpu'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'

export function cellGrain(position: Node<'vec3'>, scale: number, threshold: number) {
  const cell = position.mul(scale)
  const rnd = cellNoiseVec3(cell)
  const centre = rnd.mul(0.5).add(0.25)
  const distance = cell.fract().sub(centre).length()
  const footprint = cell.fwidth().length().max(0.001)
  const radius = footprint.mul(0.9).max(0.045)
  const core = distance
    .smoothstep(radius.mul(0.2), radius)
    .oneMinus()
  const gate = rnd.x.smoothstep(threshold, threshold + 0.012)
  const survival = footprint.smoothstep(0.3, 1.1).oneMinus()
  return {
    mask: core.mul(gate).mul(survival).clamp(),
    rnd,
  }
}
