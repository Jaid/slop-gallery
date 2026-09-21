import type {Node} from 'three/webgpu'

import {mx_noise_vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'

/**
 * Irregular mineral grains. A noise-warped cubic lattice keeps every grain's identity stable in
 * object space, so a grain keeps flashing the same color no matter where the viewer stands. The
 * warp runs at roughly the grain frequency, which bends the cell walls into organic shapes
 * instead of leaving a visible grid.
 */
export function mineralGrains(position: Node<'vec3'>, scale: number, warp: number, seed: number) {
  const q = position.mul(scale).add(mx_noise_vec3(position.mul(scale * 0.9).add(seed)).mul(warp))
  const cell = q.floor()
  const local = q.fract().sub(0.5)
  const identity = cellNoiseVec3(cell.add(seed))
  const secondary = cellNoiseVec3(cell.add(seed + 41.7))
// Unit lamella normal: the direction the grain's internal planes face.
  const lamella = identity.mul(2).sub(1).normalize()
// Distance to the nearest grain wall, normalized so 1 sits on the wall.
  const wall = local.abs().x.max(local.abs().y).max(local.abs().z).mul(2).clamp(0, 1)
  return {
    q,
    local,
    identity,
    secondary,
    lamella,
    wall,
  }
}
