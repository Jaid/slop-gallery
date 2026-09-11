import type {Node} from 'three/webgpu'

import {negateOnBackSide, normalViewGeometry, positionView} from 'three/tsl'

/** Surface-gradient bump mapping for arbitrary procedural heights, not UV texture samples. */
export default function proceduralNormal(height: Node<'float'>, strength: number) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const normal = normalViewGeometry
  const rx = dy.cross(normal)
  const ry = normal.cross(dx)
  const determinant = dx.dot(rx)
  // Unnormalized position derivatives make strength independent of distance and resolution.
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy()))
    .mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return negateOnBackSide(normal.sub(gradient.mul(strength)).normalize())
}
