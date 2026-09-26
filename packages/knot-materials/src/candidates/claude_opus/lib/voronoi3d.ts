import type {Node} from 'three/webgpu'

import {float, Fn, If, vec3, vec4} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'

type Voronoi3dInput = [Node<'vec3'>, Node<'float'>]
const cellular = Fn(([position, seed]: Voronoi3dInput) => {
  const base = position.floor()
  const local = position.fract()
  const nearestCell = vec3(0).toVar()
  const nearest = float(64).toVar()
  const second = float(64).toVar()
  for (let z = -1;z <= 1;z++) {
    for (let y = -1;y <= 1;y++) {
      for (let x = -1;x <= 1;x++) {
        const offset = vec3(x, y, z)
        const toFeature = offset.add(cellNoiseVec3(base.add(offset).add(seed)).mul(0.9).add(0.05)).sub(local)
        const distance = toFeature.dot(toFeature)
        If(distance.lessThan(nearest), () => {
          second.assign(nearest)
          nearest.assign(distance)
          nearestCell.assign(base.add(offset))
        }).ElseIf(distance.lessThan(second), () => {
          second.assign(distance)
        })
      }
    }
  }
  return vec4(nearestCell, second.sqrt().sub(nearest.sqrt()))
}).setLayout({name: 'cellular3d', type: 'vec4', inputs: [{
  type: 'vec3',
  name: 'position',
}, {
  type: 'float',
  name: 'seed',
}]})
/**
 * 3D cellular domains with a stable identity per cell. `gap` is F2 − F1, which approaches zero on cell walls.
 */
export function voronoi3d(position: Node<'vec3'>, seed = 0) {
  const result = cellular(position, float(seed))
  return {
    cell: result.xyz,
    gap: result.w,
    identity: cellNoiseVec3(result.xyz.add(seed + 57.1)),
  }
}
