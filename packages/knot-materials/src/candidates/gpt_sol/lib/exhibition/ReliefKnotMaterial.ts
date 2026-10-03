import type {Node} from 'three/webgpu'

import {Fn, negateOnBackSide, positionView, transformNormalToView, uv, varying, vec2} from 'three/tsl'

import {knotFrame} from '../../../../lib/knotFrame.ts'
import KnotMaterial from '../../../../lib/KnotMaterial.ts'

/** Surface-gradient detail over either the geometric normal or a sculpted base normal. */
export function engravedNormal(base: Node<'vec3'>, height: Node<'float'>, strength = 1) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const rx = dy.cross(base)
  const ry = base.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy()))
    .mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return negateOnBackSide(base.sub(gradient.mul(strength)).normalize())
}

/** Shared geometry and shading for continuous, low-frequency carved surfaces. */
export default abstract class ReliefKnotMaterial extends KnotMaterial {
  protected sculpt(height: (tube: Node<'vec2'>) => Node<'float'>): Node<'vec3'> {
    const surface = Fn(([tube]: [Node<'vec2'>]) => {
      const frame = knotFrame(tube)
      return frame.position.add(frame.normal.mul(height(tube)))
    })
    const tube = uv()
    const epsilon = 0.0004
    const du = surface(tube.add(vec2(epsilon, 0))).sub(surface(tube.sub(vec2(epsilon, 0))))
    const dv = surface(tube.add(vec2(0, epsilon))).sub(surface(tube.sub(vec2(0, epsilon))))
    const normal = varying(transformNormalToView(du.cross(dv).normalize())).normalize()
    this.positionNode = surface(tube)
    this.normalNode = negateOnBackSide(normal)
    return normal
  }
}
