import type {Node} from 'three/webgpu'

import {float, Fn, struct, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

const ring = [-1, 0, 1].flatMap(j => [-1, 0, 1].map(i => [i, j] as const))
const VoronoiBorderResult = struct({
  toFeature: 'vec2',
  cell: 'vec2',
  border: 'float',
}, 'VoronoiBorderResult')
type Member = <Type extends 'float' | 'vec2'>(name: string) => Node<Type>
const createCore = (period: [number, number], seed: number, jitter: number) => Fn(([p]: [Node<'vec2'>]) => {
  const size = vec2(...period)
  const base = p.floor().toVar()
  const local = p.sub(base).toVar()
  const feature = (offset: Node<'vec2'>) => cellNoiseVec3(vec3(wrapCell(base.add(offset), size), seed)).xy.sub(0.5).mul(jitter).add(0.5)
  const nearest = vec2(0).toVar()
  const nearestOffset = vec2(0).toVar()
  const nearestDistance = float(9).toVar()
  for (const [i, j] of ring) {
    const offset = vec2(i, j)
    const toFeature = offset.add(feature(offset)).toVar()
    toFeature.subAssign(local)
    const distance = toFeature.dot(toFeature)
    const closer = distance.lessThan(nearestDistance)
    nearest.assign(closer.select(toFeature, nearest))
    nearestOffset.assign(closer.select(offset, nearestOffset))
    nearestDistance.assign(closer.select(distance, nearestDistance))
  }
  const border = float(9).toVar()
  for (const [i, j] of ring) {
    const offset = nearestOffset.add(vec2(i, j))
    const toFeature = offset.add(feature(offset)).sub(local)
    const between = toFeature.sub(nearest).toVar()
    const separation = between.dot(between)
    const distance = nearest.add(toFeature).mul(0.5).dot(between.div(separation.max(1e-8).sqrt()))
    border.assign(separation.greaterThan(1e-6).select(distance.min(border), border))
  }
  return VoronoiBorderResult(nearest, wrapCell(base.add(nearestOffset), size), border)
})
const cores = new Map<string, ReturnType<typeof createCore>>
/**
 * Periodic 2D Voronoi with the exact Euclidean distance to the nearest cell border (two passes), so cracks, seams and
 * grout lines keep an even width. Distances are in lattice cells; `period` (whole cells) keeps identities consistent
 * across the UV seams.
 */
export function voronoiBorder(p: Node<'vec2'>, period: [number, number], seed = 0, jitter = 0.85) {
  const key = `${period.join('x')}:${seed}:${jitter}`
  let core = cores.get(key)
  if (!core) {
    core = createCore(period, seed, jitter)
    cores.set(key, core)
  }
  const result = (core(p) as unknown as {toVar: () => {get: Member}}).toVar()
  const toFeature = result.get<'vec2'>('toFeature')
  const cell = result.get<'vec2'>('cell')
  return {
    border: result.get<'float'>('border'),
    cell,
    center: toFeature.length(),
    toFeature,
    random: cellNoiseVec3(vec3(cell, seed + 0.5)),
  }
}
