import type {Node} from 'three/webgpu'

import {bitangentView, float, normalViewGeometry, positionViewDirection, tangentView, vec2, vec3} from 'three/tsl'

/** Coverage of a signed-distance contour, with a footprint from unwrapped coordinates. */
export function inkLine(distance: Node<'float'>, width: number, footprint: Node<'float'>) {
  const aa = footprint.max(0.00001)
  return distance.abs().smoothstep(width, aa.add(width)).oneMinus().mul(float(width * 2).div(aa).min(1))
}

export function inkFill(distance: Node<'float'>, footprint: Node<'float'>) {
  const aa = footprint.max(0.00001)
  return distance.smoothstep(aa.negate(), aa).oneMinus()
}

/** Bounded tangent-space parallax, in UV units per object-space depth for the gallery knot. */
export function tubeRay() {
  const V = positionViewDirection
  const facing = normalViewGeometry.dot(V).abs()
  return vec2(V.dot(tangentView.normalize()), V.dot(vec3(bitangentView as unknown as Node<'vec3'>).normalize()))
    .div(vec2(7.2, Math.PI * 0.26)).div(facing.max(0.28))
}
