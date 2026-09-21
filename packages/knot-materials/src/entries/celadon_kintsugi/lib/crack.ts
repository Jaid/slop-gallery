import type {Node} from 'three/webgpu'

import {float, vec3} from 'three/tsl'

/**
 * Distance between the two nearest Voronoi features: zero exactly on a cell wall.
 * Branchless, unlike the MaterialX worley, which matters because the seam shader
 * evaluates this field several times per pixel.
 */
export function crackField(position: Node<'vec3'>, scale: number) {
  // A cheap sine-free 3D hash, so the cell lookup stays affordable at 27 samples.
  const hash3 = (cell: Node<'vec3'>) => {
    let p = cell.mul(vec3(0.1031, 0.103, 0.0973)).fract()
    p = p.add(p.dot(p.yzx.add(33.33)))
    p = p.add(p.dot(p.zxy.add(p)))
    return p.fract()
  }
  const q = position.mul(scale)
  const cell = q.floor()
  const local = q.fract()
  let first: Node<'float'> = float(1e6)
  let second: Node<'float'> = float(1e6)
  for (let x = -1;x <= 1;x++) {
    for (let y = -1;y <= 1;y++) {
      for (let z = -1;z <= 1;z++) {
        const feature = hash3(cell.add(vec3(x, y, z))).mul(0.7).add(0.15)
        const distance = local.add(vec3(x, y, z)).sub(feature).length()
        const nextFirst = first.min(distance)
        second = second.min(distance.max(first))
        first = nextFirst
      }
    }
  }
  return second.sub(first)
}
