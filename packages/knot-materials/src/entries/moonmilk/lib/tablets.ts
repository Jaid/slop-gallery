import type {Node} from 'three/webgpu'

import {float, mx_noise_float, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {TAU} from '../../../lib/TAU.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

/** Brick-bond aragonite tablets: near-flat plates with hairline mortar, per-tablet jitter and flow striations. */
export function tablets(tile: Node<'vec2'>, tiles: Node<'vec2'>, seed: Node<'float'> | number) {
  const s = typeof seed === 'number' ? float(seed) : seed
  const q = tile.mul(tiles)
  const row = q.y.floor()
  const shifted = vec2(q.x.add(row.mod(2).mul(0.5)), q.y)
  const id = wrapCell(shifted.floor(), tiles)
  const local = shifted.fract().sub(0.5)
  const random = cellNoiseVec3(vec3(id, s))
  const footprint = shifted.fwidth().length().max(0.00001)
  const aa = footprint.mul(1.5).add(0.003)
  const wobble = vec2(mx_noise_float(vec3(id, s.add(9.1))), mx_noise_float(vec3(id, s.add(17.3)))).sub(0.5).mul(0.08)
  const shape = local.add(wobble).abs().div(vec2(0.49, 0.47))
  const edge = shape.x.max(shape.y)
  const face = edge.smoothstep(float(0.97).sub(aa), float(1).add(aa)).oneMinus()
  const striation = local.y.mul(7).add(random.y.mul(TAU)).sin().mul(0.5).add(0.5).pow(2)
  return {
    face,
    local,
    random,
    striation,
  }
}
