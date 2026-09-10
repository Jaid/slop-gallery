import type {Node} from 'three/webgpu'

import {cameraPosition, modelWorldMatrixInverse, mx_noise_vec3, negateOnBackSide, normalViewGeometry, positionGeometry, positionView, vec2, vec3, vec4} from 'three/tsl'

export const TAU = Math.PI * 2

export function premiumLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.00001)
  const coverage = field.abs().smoothstep(width, footprint.mul(0.85).add(width)).oneMinus()
  // Fade unresolved lines instead of letting them sparkle at a distance.
  const resolved = footprint.smoothstep(width * 4, width * 16).oneMinus()
  return coverage.mul(resolved)
}

export function premiumBands(phase: Node<'float'>) {
  const resolved = phase.fwidth().smoothstep(0.55, 2.8).oneMinus()
  return phase.cos().mul(resolved).mul(0.5).add(0.5)
}

export function premiumNormal(height: Node<'float'>, strength: number) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const n = normalViewGeometry
  const rx = dy.cross(n)
  const ry = n.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy())).mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return negateOnBackSide(n.sub(gradient.mul(strength)).normalize())
}

export function premiumView() {
  return modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(positionGeometry).normalize()
}

export function premiumDetail() {
  return positionView.length().smoothstep(1.15, 5.2).oneMinus()
}

export function premiumIntimate() {
  return positionView.length().smoothstep(0.75, 2.6).oneMinus()
}

export function premiumHash(seed: Node<'float'>) {
  return seed.mul(127.1).add(311.7).sin().mul(43758.5453).fract()
}

export /** Repeating arched architecture, evaluated at arbitrary interior positions. */
function cathedralTracery(q: Node<'vec3'>) {
  const x = q.x.mul(9).fract().sub(0.5)
  const y = q.y.mul(7).fract()
  const upper = y.smoothstep(0.43, 0.48)
  const archDistance = vec2(x, y.sub(0.46)).length().sub(0.37)
  const arch = premiumLine(archDistance, 0.014).mul(upper)
  const jambs = premiumLine(x.abs().sub(0.37), 0.012).mul(upper.oneMinus()).mul(y.smoothstep(0.08, 0.13))
  const sill = premiumLine(y.sub(0.11), 0.013).mul(x.abs().smoothstep(0.37, 0.42).oneMinus())
  const mullion = premiumLine(x, 0.009).mul(y.smoothstep(0.1, 0.16)).mul(y.smoothstep(0.72, 0.83).oneMinus())
  const roseWindow = premiumLine(vec2(x, y.sub(0.63)).length().sub(0.085), 0.01)
  const crossbar = premiumLine(y.sub(0.46), 0.009).mul(x.abs().smoothstep(0.34, 0.39).oneMinus())
  return arch.add(jambs).add(sill).add(mullion.mul(0.65)).add(roseWindow).add(crossbar.mul(0.6)).clamp()
}

export /** A signed, warped network of intersecting mineral fracture planes. */
function glacierField(q: Node<'vec3'>) {
  const warp = mx_noise_vec3(q.mul(4.3)).mul(0.045)
  const s = q.add(warp)
  const a = s.dot(vec3(17, 9, -5)).add(0.4).sin().abs()
  const b = s.dot(vec3(-8, 21, 13)).add(1.7).sin().abs()
  const c = s.dot(vec3(11, -7, 24)).sub(0.8).sin().abs()
  return a.min(b).min(c)
}
