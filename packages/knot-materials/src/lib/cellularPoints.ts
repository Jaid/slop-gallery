import type {Node} from 'three/webgpu'

import {mx_cell_noise_float} from 'three/tsl'

import {cellNoiseVec3} from './cellNoiseVec3.ts'

/** Compact, independently gated points whose support never crosses a cell boundary. */
export function cellularPoints(position: Node<'vec3'>, inner = 0.06, outer = 0.22, threshold = 0.5) {
  if (!(inner >= 0 && inner < outer && outer <= 0.24 && threshold >= 0 && threshold < 1)) {
    throw new RangeError('Invalid cellular point support or activation threshold.')
  }
  const cell = position.floor()
  const center = cellNoiseVec3(cell).mul(0.5).add(0.25)
  const distance = position.fract().sub(center).length()
  const identity = mx_cell_noise_float(cell)
  const core = distance.smoothstep(inner, outer).oneMinus()
  return core.mul(identity.smoothstep(threshold, Math.min(threshold + 0.1, 1)))
}
