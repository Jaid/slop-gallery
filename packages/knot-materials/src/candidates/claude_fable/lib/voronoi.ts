import type {Node} from 'three/webgpu'

import {float, Fn, If, int, Loop, vec2, vec3, vec4} from 'three/tsl'

import {cellNoiseVec3} from './cellNoiseVec3.ts'
import {wrapCell} from './wrapCell.ts'

type NeighborLoop = (a: object, b: object, c: object, body: (inputs: {
  i: Node<'int'>
  j: Node<'int'>
  k: Node<'int'>
}) => void) => void
const neighbors = {
  start: int(-1),
  end: int(1),
  condition: '<=',
}
/**
 * 3D Voronoi with cell identity. Returns the nearest feature distance, the second nearest, and the integer cell that owns
 * the nearest feature, so per-patch randomness can be derived that changes exactly at the Voronoi borders.
 * Packed into a vec4 (`xyz` owner cell, `w` both distances), as TSL structs cannot be stored in a `toVar`.
 */
const voronoiFn = Fn(([position]: [Node<'vec3'>]) => {
  const base = position.floor().toVar()
  const local = position.fract().toVar()
  const nearest = float(1e6).toVar()
  const second = float(1e6).toVar()
  const owner = vec3(0).toVar()
// A single Loop call with three ranges nests them and names the counters i, j, k.
;(Loop as unknown as NeighborLoop)(neighbors, neighbors, neighbors, ({i, j, k}) => {
    const offset = vec3(float(i), float(j), float(k))
    const cell = base.add(offset)
    const feature = offset.add(cellNoiseVec3(cell))
    const distance = feature.sub(local).length()
    If(distance.lessThan(nearest), () => {
      second.assign(nearest)
      nearest.assign(distance)
      owner.assign(cell)
    }).ElseIf(distance.lessThan(second), () => {
      second.assign(distance)
    })
  })
// Distances stay below 2 in a 3×3×3 neighborhood; two decimal-scaled fields pack losslessly enough for shading.
  return vec4(owner, nearest.mul(256).floor().add(second.min(1.99).div(2)))
})
export function voronoi(position: Node<'vec3'>) {
  const packed = voronoiFn(position).toVar()
  const nearest = packed.w.floor().div(256)
  const second = packed.w.fract().mul(2)
  return {
    cell: packed.xyz,
    nearest,
    second,
    edge: second.sub(nearest),
  }
}
/**
 * 2D Voronoi on a periodic lattice, for patterns that must have uniform width on the surface (cracks, seams, tiles).
 * Slicing a 3D Voronoi with a surface makes boundaries bloat wherever they run parallel to it; a lattice in tube
 * coordinates avoids that. `period` wraps cell identities so the pattern is seamless around and along the knot.
 */
const voronoi2dFn = Fn(([lattice, period, seed]: [Node<'vec2'>, Node<'vec2'>, Node<'float'>]) => {
  const base = lattice.floor().toVar()
  const local = lattice.fract().toVar()
  const nearest = float(1e6).toVar()
  const second = float(1e6).toVar()
  const owner = vec2(0).toVar()
  Loop(neighbors, neighbors, ({i, j}) => {
    const offset = vec2(float(i), float(j))
    const cell = wrapCell(base.add(offset), period)
    const feature = offset.add(cellNoiseVec3(vec3(cell, seed)).xy)
    const distance = feature.sub(local).length()
    If(distance.lessThan(nearest), () => {
      second.assign(nearest)
      nearest.assign(distance)
      owner.assign(cell)
    }).ElseIf(distance.lessThan(second), () => {
      second.assign(distance)
    })
  })
  return vec4(owner, nearest, second)
})
export function voronoi2d(lattice: Node<'vec2'>, period: Node<'vec2'>, seed: number) {
  const packed = voronoi2dFn(lattice, period, float(seed)).toVar()
  return {
    cell: packed.xy,
    nearest: packed.z,
    second: packed.w,
    edge: packed.w.sub(packed.z),
  }
}
