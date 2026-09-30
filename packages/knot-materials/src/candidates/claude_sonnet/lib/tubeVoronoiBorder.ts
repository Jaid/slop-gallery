import type {Node} from 'three/webgpu'

import {float, Fn, If, vec2, vec3, vec4} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

/** Jittered feature point of a lattice cell, in cell-local coordinates; wrapped so identities survive UV seams. */
export function voronoiFeature(cell: Node<'vec2'>, period: readonly [number, number], seed = 0, jitter = 0.85) {
  const wrapped = wrapCell(cell, vec2(period[0], period[1]))
  return cellNoiseVec3(vec3(wrapped, seed)).xy.sub(0.5).mul(jitter).add(0.5)
}

/** Periodic 2D Voronoi whose integer `period` matches the UV seams. Two-pass exact-border search: returns `edge` (distance to the nearest cell border, grid units), `distance` to the feature point, the fragment's `offset` from that point, the wrapped `cell` and a random per-cell `id`. */
export function tubeVoronoi(period: readonly [number, number], seed = 0, jitter = 0.85) {
  const periodNode = vec2(period[0], period[1])
  const search = Fn(([grid]: [Node<'vec2'>]) => {
    const base = grid.floor().toVar()
    const local = grid.fract().toVar()
    const bestD = float(16).toVar()
    const bestR = vec2(0).toVar()
    for (let j = -1;j <= 1;j++) {
      for (let i = -1;i <= 1;i++) {
        const step = vec2(i, j)
        const r = step.add(voronoiFeature(base.add(step), period, seed, jitter)).sub(local).toVar()
        const d = r.dot(r).toVar()
        If(d.lessThan(bestD), () => {
          bestD.assign(d)
          bestR.assign(r)
        })
      }
    }
    const nearest = base.add(local.add(bestR).floor()).toVar()
    const edge = float(16).toVar()
    for (let j = -2;j <= 2;j++) {
      for (let i = -2;i <= 2;i++) {
        const step = vec2(i, j)
        const cell = nearest.add(step)
        const r = cell.sub(base).add(voronoiFeature(cell, period, seed, jitter)).sub(local).toVar()
        const delta = r.sub(bestR).toVar()
        const separation = delta.dot(delta).toVar()
        If(separation.greaterThan(0.00001), () => {
          const border = bestR.add(r).mul(0.5).dot(delta.div(separation.sqrt()))
          edge.assign(border.min(edge))
        })
      }
    }
    return vec4(edge, bestD.sqrt(), nearest.x, nearest.y)
  })
  return (grid: Node<'vec2'>) => {
    const packed = search(grid)
    const nearest = packed.zw
    const cell = wrapCell(nearest, periodNode)
    return {
      cell,
      distance: packed.y,
      edge: packed.x,
      id: cellNoiseVec3(vec3(cell, seed + 17.31)),
      offset: grid.sub(nearest).sub(voronoiFeature(nearest, period, seed, jitter)),
    }
  }
}
