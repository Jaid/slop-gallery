import type {Node} from 'three/webgpu'

import {mx_atan2, vec2} from 'three/tsl'

import {hairline as opticalLine} from '../../lib/hairline.ts'

export function brassGear(q: Node<'vec3'>, offsetY: number, outer: number, teeth: number, rotation: Node<'float'>) {
  const theta = mx_atan2(q.z, q.x) as Node<'float'>
  const radius = vec2(q.x, q.z).length()
  const dY = q.y.sub(offsetY)
  const plate = dY.mul(dY).mul(-2600).exp()
  const dR = radius.sub(outer)
  const rim = dR.mul(dR).mul(-320).exp()
  const toothRing = opticalLine(theta.mul(teeth).add(rotation).sin(), 0.3)
  const toothed = rim.mul(toothRing.mul(0.85).add(0.15))
  const spokes = opticalLine(theta.mul(5).add(rotation).sin(), 0.22)
    .mul(radius.smoothstep(outer * 0.12, outer * 0.4))
    .mul(radius.smoothstep(outer, outer * 1.15).oneMinus())
  const dH = radius.sub(outer * 0.16)
  const hub = dH.mul(dH).mul(-2400).exp()
  return plate.mul(toothed.add(spokes.mul(0.9)).add(hub.mul(1.6))).clamp()
}
