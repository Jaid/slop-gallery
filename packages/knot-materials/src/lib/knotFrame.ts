import type {Node} from 'three/webgpu'

import {knotCurve} from './knotCurve.ts'
import {TAU} from './TAU.ts'

/** Object-space tube frame shared by vertex-displacing materials; no screen-space derivatives. */
export function knotFrame(tube: Node<'vec2'>) {
  const angle = tube.x.mul(TAU * 2)
  const center = knotCurve(angle)
  const next = knotCurve(angle.add(0.01))
  const tangent = next.sub(center)
  const binormal = tangent.cross(next.add(center)).normalize()
  const frameNormal = binormal.cross(tangent).normalize()
  const around = tube.y.mul(TAU)
  const normal = frameNormal.mul(around.cos().negate()).add(binormal.mul(around.sin()))
  return {
    center,
    normal,
    position: center.add(normal.mul(0.13)),
  }
}
