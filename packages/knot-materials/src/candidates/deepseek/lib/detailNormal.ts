import type {Node} from 'three/webgpu'

import {negateOnBackSide, positionView} from 'three/tsl'

/**
 * Surface-gradient bump mapping around a custom base normal, so engraved detail can be layered on top
 * of vertex displacement. Unnormalized derivatives keep the strength independent of resolution.
 */
export function detailNormal(base: Node<'vec3'>, height: Node<'float'>, strength: Node<'float'> | number) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const rx = dy.cross(base)
  const ry = base.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy())).mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return negateOnBackSide(base.sub(gradient.mul(strength)).normalize())
}
