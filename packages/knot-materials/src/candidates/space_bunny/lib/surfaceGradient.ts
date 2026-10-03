import type {Node} from 'three/webgpu'

import {negateOnBackSide, normalViewGeometry, positionView} from 'three/tsl'

/** Surface-gradient bump mapping against an arbitrary view-space base normal. Unnormalized derivatives keep strength independent of distance and resolution. */
export function normalDetail(base: Node<'vec3'>, height: Node<'float'>, strength: Node<'float'> | number) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const rx = dy.cross(base)
  const ry = base.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy())).mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return base.sub(gradient.mul(strength)).normalize()
}
/** Surface-gradient bump mapping from the geometric view normal. */
export function proceduralNormal(height: Node<'float'>, strength: Node<'float'> | number) {
  return negateOnBackSide(normalDetail(normalViewGeometry, height, strength))
}
