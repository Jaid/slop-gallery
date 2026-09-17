import type {Node} from 'three/webgpu'

import {time} from 'three/tsl'

import {TAU} from '../../lib/TAU.ts'

export function chladniField(tube: Node<'vec2'>) {
  const U = tube.x.mul(TAU)
  const V = tube.y.mul(TAU)
  const balance = time.mul(0.09).sin().mul(0.12).add(0.8)
  return U.mul(18).sin().mul(V.mul(2).sin())
    .sub(U.mul(12).cos().mul(V.mul(3).sin()).mul(balance))
    .add(U.mul(6).sin().mul(V.cos()).mul(0.2))
}
