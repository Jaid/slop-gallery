import type {Node} from 'three/webgpu'

import {negateOnBackSide, positionView} from 'three/tsl'

/** Surface-gradient bump mapping around any base normal (view space). Unnormalized screen derivatives keep the strength independent of resolution; `height` is in object units, so `strength` 1 is a true slope. */
export function bumpNormal(base: Node<'vec3'>, height: Node<'float'>, strength: Node<'float'> | number = 1) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const rx = dy.cross(base)
  const ry = base.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy())).mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return negateOnBackSide(base.sub(gradient.mul(strength)).normalize())
}
