import type {Node} from 'three/webgpu'

import {float, Fn, If, vec2, vec3, vec4} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

type VoronoiInput = [Node<'vec2'>, Node<'vec2'>, Node<'float'>, Node<'float'>]
const feature = (cell: Node<'vec2'>, period: Node<'vec2'>, seed: Node<'float'>, jitter: Node<'float'>) => cellNoiseVec3(vec3(wrapCell(cell, period), seed)).xy.sub(0.5).mul(jitter).add(0.5)
/** Two-pass exact Voronoi (Quilez): nearest feature, then true distance to the nearest bisector. */
const periodicVoronoi = Fn(([position, period, seed, jitter]: VoronoiInput) => {
  const base = position.floor()
  const local = position.fract()
  const nearestCell = vec2(0).toVar()
  const nearestOffset = vec2(0).toVar()
  const nearest = float(64).toVar()
  for (let y = -1;y <= 1;y++) {
    for (let x = -1;x <= 1;x++) {
      const offset = vec2(x, y)
      const toFeature = offset.add(feature(base.add(offset), period, seed, jitter)).sub(local)
      const distance = toFeature.dot(toFeature)
      If(distance.lessThan(nearest), () => {
        nearest.assign(distance)
        nearestOffset.assign(toFeature)
        nearestCell.assign(offset)
      })
    }
  }
  const border = float(64).toVar()
  for (let y = -2;y <= 2;y++) {
    for (let x = -2;x <= 2;x++) {
      const offset = nearestCell.add(vec2(x, y))
      const toFeature = offset.add(feature(base.add(offset), period, seed, jitter)).sub(local)
      const gap = toFeature.sub(nearestOffset)
      If(gap.dot(gap).greaterThan(0.00001), () => {
        border.assign(border.min(nearestOffset.add(toFeature).mul(0.5).dot(gap.normalize())))
      })
    }
  }
  const cell = wrapCell(base.add(nearestCell), period)
  return vec4(border, nearest.sqrt(), cell.x, cell.y)
}).setLayout({name: 'periodicVoronoi', type: 'vec4', inputs: [{
  type: 'vec2',
  name: 'position',
}, {
  type: 'vec2',
  name: 'period',
}, {
  type: 'float',
  name: 'seed',
}, {
  type: 'float',
  name: 'jitter',
}]})
/**
 * Periodic 2D Voronoi on a lattice that wraps every `period` cells, so it tiles across the UV seams.
 * `border` is the Euclidean distance to the cell wall, `cell` a wrapped integer identity.
 */
export function voronoi(position: Node<'vec2'>, period: [number, number], {seed = 0, jitter = 1}: {
  jitter?: number
  seed?: number
} = {}) {
  const result = periodicVoronoi(position, vec2(...period), float(seed), float(jitter))
  return {
    border: result.x,
    cell: result.zw,
    distance: result.y,
    identity: cellNoiseVec3(vec3(result.zw, float(seed).add(71.3))),
  }
}
