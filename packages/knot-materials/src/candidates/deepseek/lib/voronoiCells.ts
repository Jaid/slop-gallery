import type {Node} from 'three/webgpu'

import {float, mix, step, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'

/**
 * Nearest-feature Voronoi over a 3×3×3 neighborhood. Returns the distance between the two closest
 * features (zero exactly on a cell wall) plus the integer identity of the owning cell, so a shader
 * can give every cell its own height, tilt or color without a texture lookup.
 */
export function voronoiCells(position: Node<'vec3'>) {
  const base = position.floor()
  const local = position.fract()
  let nearest: Node<'float'> = float(1e6)
  let second: Node<'float'> = float(1e6)
  let identity: Node<'vec3'> = vec3(0)
  for (let x = -1;x <= 1;x++) {
    for (let y = -1;y <= 1;y++) {
      for (let z = -1;z <= 1;z++) {
        const offset = vec3(x, y, z)
        const cell = base.add(offset)
        const feature = cellNoiseVec3(cell).mul(0.7).add(0.15)
        const distance = local.sub(offset).sub(feature).length()
        identity = mix(identity, cell, step(distance, nearest))
        second = second.min(nearest.max(distance))
        nearest = nearest.min(distance)
      }
    }
  }
  return {
    edge: second.sub(nearest),
    identity,
    local,
  }
}
