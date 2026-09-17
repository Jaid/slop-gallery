import type {Node} from 'three/webgpu'

import {float, Fn, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {knotFrame} from '../../lib/knotFrame.ts'

export function terraceFields(tube: Node<'vec2'>) {
  const su = tube.x.mul(34)
  const sv = tube.y.mul(15)
  const id = vec2(su.floor(), sv.floor())
  const rnd = cellNoiseVec3(vec3(id.x.add(0.5), id.y.add(0.5), 9.1))
  const rotA = rnd.x.mul(Math.PI * 2)
  const cu = su.fract().sub(0.5)
  const cv = sv.fract().sub(0.5)
  const ru = cu.mul(rotA.cos()).sub(cv.mul(rotA.sin())).mul(0.62)
  const rv = cu.mul(rotA.sin()).add(cv.mul(rotA.cos()))
  const d = ru.abs().max(rv.abs())
  const sizeVar = rnd.y.mul(0.3).add(0.8)
  const sRaw = d.mul(-2).add(1).mul(sizeVar).clamp(0, 1)
  const level = sRaw.mul(5).floor()
  const stair = level.div(5)
  const border = d.smoothstep(0.42, 0.5)
  const ringField = sRaw.mul(5)
  const ringDist = ringField.fract().sub(0.5).abs()
  const ringW = ringField.fwidth().max(0.02)
  const edge = ringDist.smoothstep(float(0.5).sub(ringW.mul(1.6)).max(0.01), 0.5)
  const height = stair.mul(0.055).mul(border.oneMinus()).sub(border.mul(0.018))
  return {
    rnd,
    stair,
    border,
    edge,
    height,
  }
}

export const terracePosition = Fn(([
  tube,
]: [
  Node<'vec2'>,
]) => {
  const {position: p, normal} = knotFrame(tube)
  const {height} = terraceFields(tube)
  return p.add(normal.mul(height))
})
