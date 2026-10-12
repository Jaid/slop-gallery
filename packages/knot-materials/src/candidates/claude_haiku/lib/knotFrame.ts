import type {Node} from 'three/webgpu'

import {TAU} from '../../../lib/TAU.ts'
import {knotCurve} from './knotCurve.ts'

/** Radius of the gallery knot's tube, matching knotGeometryArgs. */
export const knotTubeRadius = 0.13
/**
 * Object-space tube frame at a tube UV: the centerline point, the surface point and its normal,
 * the unit tangent along the knot, and the unit tangent around the tube (direction of increasing v).
 * Uses no screen-space derivatives, so it is safe to evaluate at neighboring or unwrapped coordinates.
 */
export function tubeFrame(tube: Node<'vec2'>) {
  const angle = tube.x.mul(TAU * 2)
  const center = knotCurve(angle)
  const next = knotCurve(angle.add(0.01))
  const along = next.sub(center).normalize()
  const binormal = along.cross(next.add(center)).normalize()
  const frameNormal = binormal.cross(along).normalize()
  const around = tube.y.mul(TAU)
  const sine = around.sin()
  const cosine = around.cos()
  const normal = frameNormal.mul(cosine.negate()).add(binormal.mul(sine)).normalize()
  const tangent = frameNormal.mul(sine).add(binormal.mul(cosine)).normalize()
  return {
    along,
    center,
    normal,
    position: center.add(normal.mul(knotTubeRadius)),
    tangent,
  }
}
/** Object-space tube frame shared by vertex-displacing materials; no screen-space derivatives. */
export function knotFrame(tube: Node<'vec2'>) {
  const {center, normal, position} = tubeFrame(tube)
  return {
    center,
    normal,
    position,
  }
}
