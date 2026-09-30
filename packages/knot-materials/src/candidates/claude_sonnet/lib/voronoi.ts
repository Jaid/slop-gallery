import type {Node} from 'three/webgpu'

import {float, Fn, If, vec3, vec4} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'

/** Seamless 3D Voronoi cells with a jittered feature point per lattice cell. `x` is the distance to the nearest cell wall (a true bisector distance, so it is continuous across walls and safe to threshold), `yzw` is the integer identity of the nearest cell – hash it with `cellNoiseVec3` for per-cell randomness. Only the 27 neighbours are visited, so cells stay convex-ish. */
export const voronoi = Fn(([position]: [Node<'vec3'>]) => {
  const cell = position.floor()
  const local = position.fract()
  const nearest = float(8).toVar()
  const second = float(8).toVar()
  const toNearest = vec3(0).toVar()
  const toSecond = vec3(0).toVar()
  const identity = vec3(0).toVar()
  for (let z = -1;z <= 1;z++) {
    for (let y = -1;y <= 1;y++) {
      for (let x = -1;x <= 1;x++) {
        const offset = vec3(x, y, z)
        const neighbour = cell.add(offset)
        const toFeature = offset.add(cellNoiseVec3(neighbour).mul(0.86).add(0.07)).sub(local)
        const squared = toFeature.dot(toFeature)
        If(squared.lessThan(nearest), () => {
          second.assign(nearest)
          toSecond.assign(toNearest)
          nearest.assign(squared)
          toNearest.assign(toFeature)
          identity.assign(neighbour)
        }).ElseIf(squared.lessThan(second), () => {
          second.assign(squared)
          toSecond.assign(toFeature)
        })
      }
    }
  }
  const between = toSecond.sub(toNearest)
  const wall = toNearest.add(toSecond).mul(0.5).dot(between.normalize())
  return vec4(wall, identity)
})
