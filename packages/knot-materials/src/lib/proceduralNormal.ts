import type {Node} from 'three/webgpu'

import {negateOnBackSide, normalViewGeometry, positionView} from 'three/tsl'

/** Surface-gradient bump mapping; unnormalized derivatives keep strength independent of distance and resolution. */
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
