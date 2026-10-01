import type {Node} from 'three/webgpu'

import {atan, bitangentView, float, positionViewDirection, tangentView} from 'three/tsl'

import {knotTubeRadius} from './tubeMetric.ts'

/** Where the view ray leaves the tube again, for see-through media (exact for a straight cylinder of radius `knotTubeRadius`, which the knot’s gentle curvature approximates well). The ray is refracted in 3D: the components along the tube (a) and around it (b) shrink by η = 1/index while the rest keeps the ray unit length. - `shiftV`: the exit lies a chord further around the tube, v′ = v + ½ + atan2(η·b, cos θt)/π (in turns). Looking straight on it is the diametrically opposite side; at grazing angles it creeps back toward the entry point. - `shiftArc`: arc length carried along the knot by the ray’s axial component, opposite to the view direction. - `thickness`: path length through the medium in object units, for absorption. Assumes the tangent frame of the knot mesh: tangent toward increasing u, bitangent toward increasing v. */
export function tubeInterior(index = 1.33) {
  const eta = 1 / index
  const view = positionViewDirection
  const along = view.dot(tangentView.normalize())
  const around = view.dot((bitangentView as unknown as Node<'vec3'>).normalize())
  const cosine = float(1).sub(along.pow2().add(around.pow2()).mul(eta * eta)).max(0.0001).sqrt()
  const plane = float(1).sub(along.pow2().mul(eta * eta))
  return {
    shiftV: float(0.5).add(atan(around.mul(eta), cosine).div(Math.PI)),
    shiftArc: along.mul(cosine).mul(2 * eta * knotTubeRadius).div(plane).negate(),
    thickness: cosine.mul(2 * knotTubeRadius).div(plane),
  }
}
