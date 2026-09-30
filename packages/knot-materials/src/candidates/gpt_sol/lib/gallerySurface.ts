import type {Node} from 'three/webgpu'

import {float, vec2, vec3} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

/** A seamless toroidal embedding for low-frequency surface noise. */
export function periodicSurface(tube: Node<'vec2'>, along: number, around: number) {
  const u = tube.x.mul(TAU)
  const v = tube.y.mul(TAU)
  return vec3(u.cos().mul(along), u.sin().mul(along).add(v.cos().mul(around)), v.sin().mul(around))
}

/** Wrapped identities and unwrapped footprints prevent seams and cell-boundary derivative spikes. */
export function surfaceTile(tube: Node<'vec2'>, along: number, around: number) {
  const period = vec2(along, around)
  const q = tube.mul(period).toVar()
  return {
    q,
    local: q.fract().sub(0.5),
    cell: wrapCell(q.floor(), period),
    footprint: q.fwidth().length().max(0.0001),
  }
}

/** Subpixel area compensation keeps delicate marks from turning into bright, thick distant lines. */
export function coverage(distance: Node<'float'>, halfWidth: Node<'float'> | number, footprint: Node<'float'>) {
  const width = typeof halfWidth === 'number' ? float(halfWidth) : halfWidth
  const aa = footprint.max(0.00001)
  return distance.abs().smoothstep(width, width.add(aa)).oneMinus().mul(width.mul(2).div(aa).min(1))
}

export function resolved(phase: Node<'float'>, start = 0.5, end = 2) {
  return phase.fwidth().smoothstep(start, end).oneMinus()
}
