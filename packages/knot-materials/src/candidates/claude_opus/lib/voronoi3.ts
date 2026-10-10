import type {Node} from 'three/webgpu'

import {float, Fn, If, vec3, vec4} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'

const offsets: Array<[number, number, number]> = []
for (let x = -1;x <= 1;x++) {
  for (let y = -1;y <= 1;y++) {
 for (let z = -1;z <= 1;z++) {
    offsets.push([x, y, z])
  }}
}
/**
 * 3D Voronoi with exact distance to the nearest cell border (Quílez’s two-pass method).
 * Returns `vec4(cell.xyz, border)`: the integer lattice cell that owns the nearest feature – a stable identity for hashing – and
 * the distance to the nearest bisector plane in lattice units, which is continuous across cells and safe to filter with fwidth.
 * `jitter` in [0, 1] controls how irregular the cells are.
 */
export const voronoi3 = Fn(([position, jitter]: [Node<'vec3'>, Node<'float'>]) => {
  const cell = position.floor().toVar()
  const local = position.sub(cell).toVar()
  const nearest = vec3(0).toVar()
  const nearestCell = vec3(0).toVar()
  const best = float(64).toVar()
  for (const [x, y, z] of offsets) {
    const offset = vec3(x, y, z)
    const feature = offset.add(cellNoiseVec3(cell.add(offset)).sub(0.5).mul(jitter).add(0.5)).sub(local)
    const distance = feature.dot(feature)
    If(distance.lessThan(best), () => {
      best.assign(distance)
      nearest.assign(feature)
      nearestCell.assign(cell.add(offset))
    })
  }
  const border = float(64).toVar()
  for (const [x, y, z] of offsets) {
    const offset = vec3(x, y, z)
    const feature = offset.add(cellNoiseVec3(cell.add(offset)).sub(0.5).mul(jitter).add(0.5)).sub(local)
    const between = feature.sub(nearest)
    If(between.dot(between).greaterThan(0.00001), () => {
      border.assign(border.min(nearest.add(feature).mul(0.5).dot(between.normalize())))
    })
  }
  return vec4(nearestCell, border)
})
/**
 * Convenience wrapper: Voronoi identity, border distance and distance to the cell’s own feature point, all in lattice units.
 * `center` is recomputed from the cell identity, so it costs a single hash.
 */
export function voronoiCells(position: Node<'vec3'>, jitter: Node<'float'> | number = 1) {
  const amount = typeof jitter === 'number' ? float(jitter) : jitter
  const result = voronoi3(position, amount)
  const cell = result.xyz
  const feature = cell.add(cellNoiseVec3(cell).sub(0.5).mul(amount).add(0.5))
  return {
    cell,
    border: result.w,
    center: position.sub(feature).length(),
  }
}
