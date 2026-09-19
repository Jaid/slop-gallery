import type {Node} from 'three/webgpu'

import {Fn as fn, vec2} from 'three/tsl'

import {knotFrame} from '../../lib/knotFrame.ts'
import {TAU} from '../../lib/TAU.ts'

export const sugarRelief = 0.009

/** Three ribbons make twelve turns along the tube; all fields close at both UV seams. */
export function sugarPhase(tube: Node<'vec2'>) {
  return tube.x.mul(12).add(tube.y.mul(3)).mul(TAU)
}

export function sugarHeight(tube: Node<'vec2'>) {
  return sugarPhase(tube).mul(2).cos().mul(0.5).add(0.5).pow(2).mul(sugarRelief)
}

export const sugarPosition = fn(([tube]: [Node<'vec2'>]) => {
  const frame = knotFrame(tube)
  return frame.position.add(frame.normal.mul(sugarHeight(tube)))
})

/** Central differences shade the actual fluted surface rather than the undeformed tube. */
export const sugarSurfaceNormal = fn(([tube]: [Node<'vec2'>]) => {
  const epsilon = 0.0001
  const du = sugarPosition(tube.add(vec2(epsilon, 0))).sub(sugarPosition(tube.sub(vec2(epsilon, 0))))
  const dv = sugarPosition(tube.add(vec2(0, epsilon))).sub(sugarPosition(tube.sub(vec2(0, epsilon))))
  return du.cross(dv).normalize()
})
