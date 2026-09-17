import type {Node} from 'three/webgpu'

import {float, mix, mx_atan2} from 'three/tsl'

import {line} from '../../candidates/gpt_astra/lib/line.ts'
import {visibility} from '../../candidates/gpt_astra/lib/visibility.ts'

export function disk(radius: Node<'float'>, size: number) {
  const footprint = radius.fwidth().max(0.00001)
  return radius
    .smoothstep(footprint.negate().add(size), footprint.add(size))
    .oneMinus()
}

export function annulus(radius: Node<'float'>, inner: number, outer: number) {
  return disk(radius, outer).mul(disk(radius, inner).oneMinus())
}

export function watchGear(point: Node<'vec2'>, radius: number, teeth: number, rotation: Node<'float'>) {
  const r = point.length()
  const theta = (mx_atan2(point.y, point.x.add(0.000001)) as unknown as Node<'float'>).sub(rotation)
  const footprint = point.fwidth().length().max(0.00001)
  const angularFootprint = footprint.div(r.max(radius * 0.2))
  const toothVisibility = visibility(angularFootprint.mul(teeth), 0.7, 2.7)
  const teethWave = theta.mul(teeth).cos().smoothstep(-0.2, 0.2)
  const toothRadius = mix(float(radius * 0.94), float(radius * 1.06), teethWave)
  const edge = mix(float(radius), toothRadius, toothVisibility)
  const silhouette = r
    .smoothstep(edge.sub(footprint), edge.add(footprint))
    .oneMinus()
  const spokeVisibility = visibility(angularFootprint.mul(6), 0.35, 1.8)
  const spokes = mix(float(0.16), theta.mul(6).cos().smoothstep(0.85, 0.96), spokeVisibility)
  const rim = r.smoothstep(radius * 0.64, radius * 0.76)
  const hub = disk(r, radius * 0.23)
  return {
    r,
    theta,
    mask: silhouette.mul(rim.max(hub).max(spokes)),
    engraving: line(r.sub(radius * 0.84), radius * 0.018),
  }
}
