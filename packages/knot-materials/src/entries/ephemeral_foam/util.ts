import type {Node} from 'three/webgpu'

import {float, Fn as fn, select, vec2, vec3, vec4} from 'three/tsl'

import {wrapCell} from '../../candidates/gpt_astra/lib/wrapCell.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'

export const packedCells = fn(([
  q,
  period,
]: [
  Node<'vec2'>,
  Node<'vec2'>,
]) => {
  const base = q.floor().toVar()
  const fraction = q.fract().toVar()
  const first = float(1e6).toVar()
  const second = float(1e6).toVar()
  const nearest = vec2(0).toVar()
  const identity = float(0).toVar()
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      const offset = vec2(x, y)
      const id = wrapCell(base.add(offset), period)
      const random = cellNoiseVec3(vec3(id, 7.19))
      const delta = offset
        .add(random.xy.mul(0.7).add(0.15))
        .sub(fraction)
      const distanceSquared = delta.dot(delta).toVar()
      const nearer = distanceSquared.lessThan(first).toVar()
      second.assign(select(nearer, first, second.min(distanceSquared)))
      nearest.assign(select(nearer, delta, nearest))
      identity.assign(select(nearer, random.z, identity))
      first.assign(first.min(distanceSquared))
    }
  }
  return vec4(nearest, identity, second.sqrt().sub(first.sqrt()).max(0))
})
