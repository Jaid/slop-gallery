import type {Node} from 'three/webgpu'

import {Fn, If, Loop, struct, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'

type LoopSpec = {
  condition: string
  end: number
  name: string
  start: number
}
type LoopBody = (variables: Record<string, Node<'int'>>) => void
/**
 * `three`’s own typings only describe one- and two-deep loops without names, so the jitter search
 * below goes through this thin, correctly typed shim.
 */
const each = (spec: LoopSpec, body: LoopBody) => {
  (Loop as unknown as (spec: LoopSpec, body: LoopBody) => void)(spec, body)
}
const voronoiStruct = struct({
  key: 'vec3',
  offset: 'vec3',
  distance: 'float',
  edge: 'float',
})
const voronoiFn = Fn(([p]: [Node<'vec3'>]) => {
  const cell = p.floor()
  const local = p.fract()
  const pair = vec3(1e9, 1e9, 1e9).toVar()
  const key = vec3(0).toVar()
  const offset = vec3(0).toVar()
  each({
    name: 'x',
    start: -1,
    end: 1,
    condition: '<=',
  }, ({x}) => {
    each({
      name: 'y',
      start: -1,
      end: 1,
      condition: '<=',
    }, ({y}) => {
      each({
        name: 'z',
        start: -1,
        end: 1,
        condition: '<=',
      }, ({z}) => {
        const neighbor = vec3(x, y, z)
        const candidate = cell.add(neighbor)
        const feature = cellNoiseVec3(candidate).mul(0.5).add(0.25)
        const delta = neighbor.add(feature).sub(local)
        const dist = delta.lengthSq().toVar()
        If(dist.lessThan(pair.x), () => {
          pair.z.assign(pair.y)
          pair.y.assign(pair.x)
          pair.x.assign(dist)
          key.assign(candidate)
          offset.assign(delta)
        }).ElseIf(dist.lessThan(pair.y), () => {
          pair.z.assign(pair.y)
          pair.y.assign(dist)
        }).ElseIf(dist.lessThan(pair.z), () => {
          pair.z.assign(dist)
        })
      })
    })
  })
  const near = pair.x.sqrt()
  return voronoiStruct(key, offset, near, pair.y.sqrt().sub(near).mul(0.5))
})
/**
 * Nearest-feature Voronoi over a jittered 3D lattice. Returns the integer cell identity, the vector
 * from the sample to that cell’s feature point, the distance to it and the distance to the cell
 * boundary (half the gap to the second nearest feature). Seamless on any closed surface because the
 * lattice lives in object space rather than in UV.
 */
export function voronoi3(p: Node<'vec3'>) {
  const call = voronoiFn(p)
  return {
    key: call.get('key') as Node<'vec3'>,
    offset: call.get('offset') as Node<'vec3'>,
    distance: call.get('distance') as Node<'float'>,
    edge: call.get('edge') as Node<'float'>,
  }
}
