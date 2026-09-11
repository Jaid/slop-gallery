import type {Node} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {cameraPosition, float, Fn, modelWorldMatrixInverse, negateOnBackSide, normalViewGeometry, positionGeometry, positionView, positionViewDirection, vec2, vec3, vec4} from 'three/tsl'

export function spectralColor(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.46).add(0.54)
}

export function filament(field: Node<'float'>, width: number) {
  return field.abs().smoothstep(width, field.fwidth().mul(1.2).max(0.0001).add(width)).oneMinus()
}

export function proceduralNormal(height: Node<'float'>, strength: Node<'float'> | number) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const normal = normalViewGeometry
  const rx = dy.cross(normal)
  const ry = normal.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy())).mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return negateOnBackSide(normal.sub(gradient.mul(strength)).normalize())
}

export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus().mul(footprint.smoothstep(width * 3, width * 12).oneMinus())
}

export function viewerFrame() {
  const p = positionGeometry
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const view = cameraLocal.sub(p).normalize()
  const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
  const grazing = facing.oneMinus()
  const distance = positionView.length()
  return {
    p,
    cameraLocal,
    view,
    facing,
    grazing,
    rim: grazing.abs().pow(2),
    distance,
    near: distance.smoothstep(1.25, 5.5).oneMinus(),
    intimate: distance.smoothstep(0.8, 2.7).oneMinus(),
  }
}

export function bell(value: Node<'float'>, centre: number, sharpness: number) {
  const d = value.sub(centre)
  return d.mul(d).mul(-sharpness).exp()
}

export const cellNoiseVec3 = (tsl as typeof tsl & {
  mx_cell_noise_vec3: (position: Node<'vec3'>) => Node<'vec3'>
}).mx_cell_noise_vec3

export const knotCurve = Fn(([
  angle]: [
  Node<'float'>,
]) => {
  const phase = angle.mul(1.5)
  const radius = phase.cos().add(2).mul(0.225)
  return vec3(radius.mul(angle.cos()), radius.mul(angle.sin()), phase.sin().mul(0.225))
})

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
  tube]: [
  Node<'vec2'>,
]) => {
  const angle = tube.x.mul(Math.PI * 4)
  const center = knotCurve(angle)
  const next = knotCurve(angle.add(0.01))
  const tangent = next.sub(center)
  const binormal = tangent.cross(next.add(center)).normalize()
  const frameNormal = binormal.cross(tangent).normalize()
  const around = tube.y.mul(Math.PI * 2)
  const normal = frameNormal.mul(around.cos().negate()).add(binormal.mul(around.sin()))
  const p = center.add(normal.mul(0.13))
  const {height} = terraceFields(tube)
  return p.add(normal.mul(height))
})
