import type {Node} from 'three/webgpu'

import {float, select, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

/** Voronoi cells on the knot’s (u, v) surface. `cells` is how many cells wrap around each axis (integers, so the seams close); for square cells on the exhibition knot use a ratio of about 8.8 : 1. Distances are in units of one cell. `id` is a stable random triplet per cell and `edge` is the F2 − F1 distance to the nearest border. */
export function tubeVoronoi(tube: Node<'vec2'>, cells: readonly [number, number], jitter = 0.9, seed = 0) {
  const period = vec2(...cells)
  const scaled = tube.mul(period)
  const base = scaled.floor()
  const local = scaled.fract()
  let nearest: Node<'float'> = float(8)
  let second: Node<'float'> = float(8)
  let id: Node<'vec3'> = vec3(0)
  let offset: Node<'vec2'> = vec2(0)
  for (let j = -1;j <= 1;j++) {
    for (let i = -1;i <= 1;i++) {
      const step = vec2(i, j)
      const random = cellNoiseVec3(vec3(wrapCell(base.add(step), period), seed + 0.5))
      const point = step.add(random.xy.mul(jitter).add((1 - jitter) / 2))
      const toPoint = point.sub(local)
      const distance = toPoint.length()
      const closer = distance.lessThan(nearest)
      second = select(closer, nearest, second.min(distance)).toVar()
      id = select(closer, random, id).toVar()
      offset = select(closer, toPoint, offset).toVar()
      nearest = nearest.min(distance).toVar()
    }
  }
  return {
    nearest,
    second,
    edge: second.sub(nearest),
    id,
    offset,
  }
}
