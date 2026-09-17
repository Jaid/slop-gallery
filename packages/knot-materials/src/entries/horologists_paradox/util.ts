import type {Node} from 'three/webgpu'

import {float, mix, mx_atan2} from 'three/tsl'

import {visibility} from '../../candidates/gpt_astra/lib/visibility.ts'

// Footprints must come from unwrapped coordinates, never from a repeated shape.
export function disk(radius: Node<'float'>, size: number, footprint: Node<'float'>) {
  return radius
    .smoothstep(footprint.negate().add(size), footprint.add(size))
    .oneMinus()
}

export function annulus(radius: Node<'float'>, inner: number, outer: number, footprint: Node<'float'>) {
  return disk(radius, outer, footprint).mul(disk(radius, inner, footprint).oneMinus())
}

export function watchLine(field: Node<'float'>, width: number, footprint: Node<'float'>) {
  return field.abs().smoothstep(width, footprint.add(width)).oneMinus()
}

export function watchGear(point: Node<'vec2'>, radius: number, teeth: number, rotation: Node<'float'>, footprint: Node<'float'>) {
  const r = point.length()
  const theta = (mx_atan2(point.y, point.x.add(0.000001)) as unknown as Node<'float'>).sub(rotation)
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
  const hub = disk(r, radius * 0.23, footprint)
  return {
    r,
    theta,
    mask: silhouette.mul(rim.max(hub).max(spokes)),
    engraving: watchLine(r.sub(radius * 0.84), radius * 0.018, footprint),
  }
}

export function watchWave(phase: Node<'float'>, footprint: Node<'float'>) {
  return phase.cos().mul(visibility(footprint, 0.6, 3.2))
}
