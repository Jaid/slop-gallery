import type {Node} from 'three/webgpu'

import {float, Fn, If, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'

export const aggregatePeriods = [84, 18] as const

// Periodic jittered Voronoi: return squared-distance gap and nearest chip identity.
// Integer seed wrapping closes both UV seams without repeating a visible square stamp.
//
export const aggregateField = Fn(([tube]: [Node<'vec2'>]) => {
  const grid = tube.mul(vec2(...aggregatePeriods))
  const cell = grid.floor()
  const local = grid.fract()
  const first = float(10).toVar()
  const second = float(10).toVar()
  const identity = vec3(0).toVar()
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      const offset = vec2(x, y)
      const wrapped = cell.add(offset).mod(vec2(...aggregatePeriods))
      const seed = cellNoiseVec3(vec3(wrapped, 17))
      const delta = offset.add(seed.xy.mul(0.6).add(0.2)).sub(local)
      const distance = delta.dot(delta)
      If(distance.lessThan(first), () => {
        second.assign(first)
        first.assign(distance)
        identity.assign(seed)
      }).Else(() => {
        second.assign(second.min(distance))
      })
    }
  }
  return vec3(second.sub(first), identity.x, identity.z)
})
