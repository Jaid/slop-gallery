import type {Node} from 'three/webgpu'

import {Fn as fn} from 'three/tsl'

import {knotFrame} from '../../lib/knotFrame.ts'
import {TAU} from '../../lib/TAU.ts'

export function bonbonPhase(tube: Node<'vec2'>) {
  return tube.y.add(tube.x.mul(3)).mul(TAU)
}

/** Six rounded sugar flutes: displacement ∈ [−0.018, 0.010] meters. */
export function bonbonOffset(tube: Node<'vec2'>) {
  const flute = bonbonPhase(tube).mul(6).cos().mul(0.5).add(0.5)
  return flute.mul(0.024).sub(0.016).add(tube.x.mul(TAU * 8).sin().mul(0.002))
}

export const bonbonPosition = fn(([tube]: [Node<'vec2'>]) => {
  const frame = knotFrame(tube)
  return frame.position.add(frame.normal.mul(bonbonOffset(tube)))
})
