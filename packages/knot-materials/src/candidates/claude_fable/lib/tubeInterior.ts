import type {Node} from 'three/webgpu'

import {float, normalLocal, positionGeometry, refract, tangentLocal} from 'three/tsl'

import {knotGeometryArgs} from '../../../geometry.ts'
import {viewerFrame} from '../../../lib/viewerFrame.ts'

/** Radius of the exhibition tube in object units. */
export const tubeRadius = knotGeometryArgs[1]
export type TubeInterior = ReturnType<typeof tubeInterior>
/**
 * Local cylinder frame for looking into the tube: the knot is treated as a straight cylinder around the fragment, which
 * is accurate to a few percent at the tube's scale. Points inside are described by a cross-section (x toward the surface
 * normal, y along the bitangent, both in object units) and an offset along the tube.
 */
export function tubeInterior(ior = 1) {
  const {view, cameraLocal, facing} = viewerFrame()
  const n = normalLocal.normalize()
  const t = tangentLocal.normalize()
  const b = n.cross(t).normalize()
  const center = positionGeometry.sub(n.mul(tubeRadius))
  const enter = view.negate()
  const direction = ior === 1 ? enter : refract(enter, n, float(1 / ior)).normalize()
  const perpendicular = direction.sub(t.mul(direction.dot(t)))
// Chord of the cylinder along the entering ray: the far side of the tube in object units.
  const chord = n.dot(direction).mul(-2 * tubeRadius).div(perpendicular.lengthSq().max(0.05)).min(tubeRadius * 3)
  const cameraOffset = cameraLocal.sub(center)
  const cameraAngle = cameraOffset.dot(b).atan(cameraOffset.dot(n))
  const section = (q: Node<'vec3'>) => {
    const offset = q.sub(center)
    return {
      x: offset.dot(n),
      y: offset.dot(b),
      along: offset.dot(t),
    }
  }
  const at = (depth: Node<'float'>) => positionGeometry.add(direction.mul(depth))
  return {
    at,
    b,
    cameraAngle,
    center,
    chord,
    direction,
    facing,
    n,
    section,
    t,
    view,
  }
}
