import type {Node} from 'three/webgpu'

import {negateOnBackSide, normalViewGeometry, positionView} from 'three/tsl'

/**
 * Surface-gradient bump mapping; unnormalized derivatives keep strength independent of distance and resolution.
 * Pass `base` (a view-space normal, not yet flipped for back faces) to layer detail on top of a custom normal,
 * for example one interpolated from vertex displacement.
 */
export function proceduralNormal(height: Node<'float'>, strength: Node<'float'> | number, base: Node<'vec3'> = normalViewGeometry) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const rx = dy.cross(base)
  const ry = base.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy())).mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return negateOnBackSide(base.sub(gradient.mul(strength)).normalize())
}
