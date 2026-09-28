import type {Node} from 'three/webgpu'

import {atan, cameraPosition, modelWorldMatrixInverse, uv, vec2, vec3, vec4} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'
import {knotFrame, knotTubeRadius} from './knotFrameOpus55.ts'

/**
 * A refracted viewing ray through the solid knot tube, for volumetric interiors.
 *
 * The tube is treated locally as a straight cylinder, which makes the exit distance analytic.
 * `sample(t)` maps a point at ray distance `t` into both object space and tube coordinates,
 * so interiors can be authored either as 3D fields or as fields around the centerline.
 */
export function tubeInterior({ior = 1.5, maxChord = 0.55}: {
  ior?: number
  maxChord?: number
} = {}) {
  const tube = uv()
  const frame = knotFrame(tube)
  const {center, normal, tangent, frameNormal, binormal, speed} = frame
  const entry = frame.position
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const view = cameraLocal.sub(entry).normalize()
  const direction = view.negate().refract(normal, 1 / ior).normalize()
  const across = direction.sub(tangent.mul(direction.dot(tangent)))
  const chord = normal.mul(knotTubeRadius).dot(across).mul(-2).div(across.dot(across).max(0.0001)).clamp(0, maxChord)
  const sample = (t: Node<'float'> | number) => {
    const position = entry.add(direction.mul(t))
    const relative = position.sub(center)
    const x = relative.dot(frameNormal)
    const y = relative.dot(binormal)
    const radius = vec3(x, y, 0).length()
    return {position, radius: radius.div(knotTubeRadius),
/** tube coordinates of the sample, in UV units */
      tube: vec2(tube.x.add(relative.dot(tangent).div(speed)), atan(y, x.negate()).div(TAU).fract())}
  }
  return {
    cameraLocal,
    chord,
    direction,
    entry,
    frame,
    sample,
    view,
  }
}
