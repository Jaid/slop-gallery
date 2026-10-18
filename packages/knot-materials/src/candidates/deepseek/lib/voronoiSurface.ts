import type {Node} from 'three/webgpu'

import {float, Fn, If, Loop, struct, vec2, vec3, vec4} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

export type SurfaceVoronoi = {
  /** Integer coordinates of the nearest cell. */
  cell: Node<'vec2'>
  /** Distance to the nearest feature point. */
  d1: Node<'float'>
  /** Distance to the second nearest feature point. */
  d2: Node<'float'>
  /** Distance to the third nearest feature point. */
  d3: Node<'float'>
  /** Distance between the two nearest feature points; zero on a cell border. */
  edge: Node<'float'>
  /** Stable random identity of the nearest cell. */
  random: Node<'vec3'>
}

const bounds = {
  start: -1,
  condition: '<',
  end: 2,
  type: 'int',
} as const
const layout = struct({
  distances: 'vec4',
  cell: 'vec2',
  random: 'vec3',
})
/**
 * A jittered 2D Voronoi diagram whose lattice repeats every `period` cells. Wrapping the cell
 * identity rather than the sampled point keeps every cell, border and color continuous across the
 * seam of the knot's cylindrical UVs. The loops and conditionals live inside `Fn`, because they
 * need the shader stack that only exists while a material is being built.
 */
const voronoiSurfaceFunction = Fn(([point, period, seed]: [Node<'vec2'>, Node<'vec2'>, Node<'float'>]) => {
  const base = point.floor()
  const local = point.fract()
  const nearestDistance = float(1e6).toVar()
  const secondDistance = float(1e6).toVar()
  const thirdDistance = float(1e6).toVar()
  const nearestCell = vec2(0).toVar()
  const nearestRandom = vec3(0).toVar()
  Loop(bounds, bounds, ({i, j}) => {
    const offset = vec2(i, j)
    const cell = base.add(offset)
    const random = cellNoiseVec3(vec3(wrapCell(cell, period), seed))
    const center = offset.add(random.xy.mul(0.8).add(0.1))
    const distance = local.sub(center).length()
    If(distance.lessThan(nearestDistance), () => {
      thirdDistance.assign(secondDistance)
      secondDistance.assign(nearestDistance)
      nearestDistance.assign(distance)
      nearestCell.assign(cell)
      nearestRandom.assign(random)
    }).ElseIf(distance.lessThan(secondDistance), () => {
      thirdDistance.assign(secondDistance)
      secondDistance.assign(distance)
    }).ElseIf(distance.lessThan(thirdDistance), () => {
      thirdDistance.assign(distance)
    })
  })
  return layout(vec4(nearestDistance, secondDistance, thirdDistance, secondDistance.sub(nearestDistance)), nearestCell, nearestRandom)
})
const member = (node: unknown, name: string) => (node as {get: (key: string) => Node}).get(name)
export function voronoiSurface(point: Node<'vec2'>, period: Node<'vec2'>, seed = 0) {
  const values = voronoiSurfaceFunction(point, period, seed)
  const distances = member(values, 'distances') as Node<'vec4'>
  return {
    cell: member(values, 'cell') as Node<'vec2'>,
    d1: distances.x,
    d2: distances.y,
    d3: distances.z,
    edge: distances.w,
    random: member(values, 'random') as Node<'vec3'>,
  }
}
