import type {Node} from 'three/webgpu'

import {float, Fn, struct, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'

const offsets = [-1, 0, 1].flatMap(x => [-1, 0, 1].flatMap(y => [-1, 0, 1].map(z => [x, y, z] as const)))
const VoronoiResult = struct({
  toFeature: 'vec3',
  border: 'float',
  borderDirection: 'vec3',
}, 'VoronoiResult')
type Member = <Type extends 'float' | 'vec3'>(name: string) => Node<Type>
const createVoronoiCore = (jitter: number) => {
// Jitter below 1 keeps every feature strictly inside its own cell, so the nearest cell can be recovered from its offset.
  const featureOffset = (cell: Node<'vec3'>) => cellNoiseVec3(cell).sub(0.5).mul(jitter).add(0.5)
  return Fn(([position]: [Node<'vec3'>]) => {
    const base = position.floor().toVar()
    const local = position.sub(base).toVar()
    const nearest = vec3(0).toVar()
    const nearestOffset = vec3(0).toVar()
    const nearestDistance = float(1e9).toVar()
// First pass: nearest feature point.
    for (const offset of offsets) {
      const cellOffset = vec3(...offset)
      const toFeature = cellOffset.add(featureOffset(base.add(cellOffset))).sub(local).toVar()
      const distance = toFeature.dot(toFeature)
      const closer = distance.lessThan(nearestDistance)
      nearest.assign(closer.select(toFeature, nearest))
      nearestOffset.assign(closer.select(cellOffset, nearestOffset))
      nearestDistance.assign(closer.select(distance, nearestDistance))
    }
// Second pass around the winner: exact distance to the closest bisector plane, and that plane's normal.
    const border = float(1e9).toVar()
    const borderDirection = vec3(0, 0, 1).toVar()
    for (const offset of offsets) {
      const cellOffset = nearestOffset.add(vec3(...offset))
      const toFeature = cellOffset.add(featureOffset(base.add(cellOffset))).sub(local)
      const between = toFeature.sub(nearest)
      const separation = between.dot(between)
      const direction = between.div(separation.max(1e-12).sqrt())
      const distance = nearest.add(toFeature).mul(0.5).dot(direction)
      const closer = separation.greaterThan(1e-6).and(distance.lessThan(border))
      border.assign(closer.select(distance, border))
      borderDirection.assign(closer.select(direction, borderDirection))
    }
    return VoronoiResult(nearest, border, borderDirection)
  })
}
const cores = new Map<number, ReturnType<typeof createVoronoiCore>>
/**
 * Two-pass 3D Voronoi: the nearest cell's identity, the vector to its feature point, F1 distance,
 * the exact Euclidean distance to the cell border (for crisp, even-width seams) and the direction toward that border.
 */
export function voronoi(position: Node<'vec3'>, jitter = 0.95) {
  if (!(jitter >= 0 && jitter < 1)) {
    throw new RangeError('Voronoi jitter must be in [0, 1).')
  }
  let core = cores.get(jitter)
  if (!core) {
    core = createVoronoiCore(jitter)
    cores.set(jitter, core)
  }
  const result = (core(position) as unknown as {toVar: () => {get: Member}}).toVar()
  const toFeature = result.get<'vec3'>('toFeature')
  const cell = position.floor().add(position.fract().add(toFeature).floor())
  return {cell, toFeature, distance: toFeature.length(), border: result.get<'float'>('border'),
/** Unit direction (in the Voronoi domain) in which the nearest border lies. */
    borderDirection: result.get<'vec3'>('borderDirection'), random: cellNoiseVec3(cell.add(0.5))}
}
