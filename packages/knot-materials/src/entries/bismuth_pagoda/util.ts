import type {Node} from 'three/webgpu'

import {Fn, mx_noise_float, positionGeometry} from 'three/tsl'

import {knotFrame} from '../../lib/knotFrame.ts'

export function hopperFields(tube: Node<'vec2'>) {
  const levels = 7
  const wobble = tube.x.mul(Math.PI * 2 * 3).sin().mul(1.5)
  const ring = tube.y.mul(Math.PI * 2 * 3).add(wobble).sin().mul(0.5).add(0.5)
  const stepped = ring.mul(levels)
  const terrace = stepped.floor()
  const inTerrace = stepped.fract()
  const riser = inTerrace.smoothstep(0.78, 1)
  const staircase = terrace.add(riser).div(levels)
  return {
    staircase,
    terrace,
    riser,
    inTerrace,
  }
}

export const hopperPosition = Fn(([
  tube,
]: [
  Node<'vec2'>,
]) => {
  const {center, normal: radial} = knotFrame(tube)
  const {staircase} = hopperFields(tube)
  const lift = staircase.sub(0.5).mul(0.07).add(mx_noise_float(positionGeometry.mul(5)).mul(0.006)).add(0.13)
  return center.add(radial.mul(lift))
})
