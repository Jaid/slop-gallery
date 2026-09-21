import type {Node} from 'three/webgpu'

import {float, Fn, If, int, Loop, vec3, vec4} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'

type LoopParams = {
  condition: string
  end: Node<'int'>
  name: string
  start: number
}
type LoopBody = (inputs: Record<string, LoopNodeInput>) => void
type LoopNodeInput = Node<'int'>
// Three.js ships loop types that only cover two levels and omit the variable name, so the
// runtime signature is reached through a narrow cast instead of duplicating the loop by hand.
const loop = Loop as unknown as (params: LoopParams, body: LoopBody) => void
/**
 * Jittered 3D Voronoi, packed as `(distance, cellIdentity)`. Returns the distance to the nearest
 * feature point together with the identity of the owning cell, so every organic domain can carry
 * its own random properties. Unlike the raw cell-noise lattice this produces irregular blobs
 * instead of axis-aligned cubes. The loop must live inside an `Fn` so its statements reach a stack.
 */
const voronoiDomainPacked = Fn(([position]: [Node<'vec3'>]) => {
  const p = vec3(position).toVar()
  const base = p.floor()
  const local = p.fract()
  const nearest = float(1e6).toVar()
  const owner = vec3(0).toVar()
  loop({
    start: -1,
    end: int(1),
    name: 'x',
    condition: '<=',
  }, ({x}) => {
    loop({
      start: -1,
      end: int(1),
      name: 'y',
      condition: '<=',
    }, ({y}) => {
      loop({
        start: -1,
        end: int(1),
        name: 'z',
        condition: '<=',
      }, ({z}) => {
        const offset = vec3(x, y, z)
        const cell = base.add(offset)
        const point = offset.add(cellNoiseVec3(cell))
        const distance = local.sub(point).length()
        If(distance.lessThan(nearest), () => {
          nearest.assign(distance)
          owner.assign(cell)
        })
      })
    })
  })
  return vec4(nearest, cellNoiseVec3(owner))
})
export function voronoiDomain(position: Node<'vec3'>) {
  const packed = voronoiDomainPacked(position)
  return {
    distance: packed.x,
    id: packed.yzw,
  }
}
