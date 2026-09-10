import type {Node} from 'three/webgpu'

import {negateOnBackSide, normalLocal, normalViewGeometry, positionGeometry, positionView, time, transformNormalToView, vec3} from 'three/tsl'

export function liquidNormal(detail: Node<'float'>, strength = 1) {
  const p = positionGeometry
  const a = vec3(4, 6, 3)
  const b = vec3(-3, 5, 7)
  const phaseA = p.dot(a).add(time.mul(0.045))
  const phaseB = p.dot(b).sub(time.mul(0.03))
  const warp = phaseA.sin().mul(2.8).add(phaseB.sin().mul(1.8))
  const warpGradient = a.mul(phaseA.cos()).mul(2.8).add(b.mul(phaseB.cos()).mul(1.8))
  const u = vec3(22, 8, -10)
  const v = vec3(-9, 19, 12)
  const phaseU = p.dot(u).add(warp)
  const phaseV = p.dot(v).sub(warp.mul(0.7))
  const gradientU = u.add(warpGradient)
  const gradientV = v.sub(warpGradient.mul(0.7))
  const fineAxis = vec3(39, -17, 31)
  const phaseFine = p.dot(fineAxis).add(phaseU.sin().mul(1.5))
  const gradientFine = fineAxis.add(gradientU.mul(phaseU.cos()).mul(1.5))
  const gradient = gradientU.mul(phaseU.cos()).mul(0.014).add(gradientV.mul(phaseV.cos()).mul(0.012)).add(gradientFine.mul(phaseFine.cos()).mul(detail).mul(0.0016))
  const normal = normalLocal.normalize()
  const tangentGradient = gradient.sub(normal.mul(gradient.dot(normal)))
  return negateOnBackSide(transformNormalToView(normal.sub(tangentGradient.mul(strength)).normalize()))
}

export function spectralColor(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.46).add(0.54)
}

export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus().mul(footprint.smoothstep(width * 3, width * 12).oneMinus())
}

export function opticalBands(phase: Node<'float'>) {
  const visibility = phase.fwidth().smoothstep(0.6, 3).oneMinus()
  return phase.cos().mul(visibility).mul(0.5).add(0.5)
}

export function proceduralNormal(height: Node<'float'>, strength: number) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const normal = normalViewGeometry
  const rx = dy.cross(normal)
  const ry = normal.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy())).mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return negateOnBackSide(normal.sub(gradient.mul(strength)).normalize())
}
