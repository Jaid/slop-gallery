import type {Node} from 'three/webgpu'

import {normalViewGeometry, positionView} from 'three/tsl'

export function bumpNormal(height: Node<'float'>, normal: Node<'vec3'> = normalViewGeometry) {
  const N = normal.normalize()
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const rx = dy.cross(N)
  const ry = N.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx())
    .add(ry.mul(height.dFdy()))
    .mul(determinant.sign())
    .div(determinant.abs().max(1e-12))
  return N.sub(gradient).normalize()
}
