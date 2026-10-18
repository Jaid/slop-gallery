import type {Node} from 'three/webgpu'

import {float, negateOnBackSide, positionView} from 'three/tsl'

/** Screen-space bump mapping around an arbitrary, already displaced view-space normal. */
export function bumpNormal(height: Node<'float'>, baseNormal: Node<'vec3'>, strength: Node<'float'> | number) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const normal = baseNormal.normalize()
  const rx = dy.cross(normal)
  const ry = normal.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy())).mul(determinant.sign()).div(determinant.abs().max(1e-12))
  const scale = typeof strength === 'number' ? float(strength) : strength
  return negateOnBackSide(normal.sub(gradient.mul(scale)).normalize())
}
