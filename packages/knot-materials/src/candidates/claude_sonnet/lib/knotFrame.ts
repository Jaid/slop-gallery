import type {Node} from 'three/webgpu'

import {knotCurve} from '../../../lib/knotCurve.ts'
import {TAU} from '../../../lib/TAU.ts'

/** Radius of the exhibition knot’s tube, matching `knotGeometryArgs`. */
export const knotTubeRadius = 0.13
/** Approximate centerline length in object space, and the tube circumference. Handy to make isotropic patterns. */
export const knotLength = 7.2
export const knotCircumference = TAU * knotTubeRadius
/** Object-space tube frame shared by vertex-displacing materials; no screen-space derivatives. `axis` points along increasing u, `across` along increasing v and `normal` out of the surface. */
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
    axis: tangent.normalize(),
    across: frameNormal.mul(around.sin()).add(binormal.mul(around.cos())),
    frameNormal,
    binormal,
    position: center.add(normal.mul(knotTubeRadius)),
  }
}
