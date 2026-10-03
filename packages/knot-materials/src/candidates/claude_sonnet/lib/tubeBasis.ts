import type {Node} from 'three/webgpu'

import {knotCurve} from '../../../lib/knotCurve.ts'
import {TAU} from '../../../lib/TAU.ts'

/** Object-space tube frame shared by vertex-displacing materials; no screen-space derivatives. `along` and `around` are unit directions of increasing u and v on the surface, so a view vector can be expressed in UV space without depending on the handedness of generated tangents. */
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
    along: tangent.normalize(),
    around: frameNormal.mul(around.sin()).add(binormal.mul(around.cos())),
    position: center.add(normal.mul(0.13)),
  }
}
