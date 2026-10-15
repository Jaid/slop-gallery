import type {Node} from 'three/webgpu'

import {atan, float, vec2} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'
import {knotFrame} from './knotFrameSurface.ts'

/** Wrap an angle into (−π, π]. */
export function wrapAngle(angle: Node<'float'>) {
  return angle.sub(angle.div(TAU).round().mul(TAU))
}
/**
 * The knot tube’s cross-section as seen by the viewer: a fixed section basis (`e1`, `e2`, matching the mesh’s
 * around-angle a = 2π·v as normal = e1·cos a + e2·sin a), the viewer’s direction projected into the section, the
 * pixel’s angle relative to it and the lateral offset of the line of sight from the centerline (in tube radii).
 * `obliquity` is how far a ray drifts along the knot per unit of inward travel across the section.
 */
export function tubeSection(tube: Node<'vec2'>, view: Node<'vec3'>) {
  const frame = knotFrame(tube)
  const base = knotFrame(vec2(tube.x, 0))
  const e1 = base.normal
  const e2 = base.around
  const angle = tube.y.mul(TAU)
  const axial = view.dot(frame.along)
  const across = view.sub(frame.along.mul(axial))
  const acrossLength = across.length().max(0.0001)
  const viewAngle = atan(across.dot(e2), across.dot(e1))
  const relative = wrapAngle(angle.sub(viewAngle))
  return {
    frame,
    e1,
    e2,
    angle,
    viewAngle,
    relative,
    lateral: relative.sin(),
    depth: relative.cos(),
    obliquity: axial.div(acrossLength).clamp(-1.6, 1.6),
    crossing: acrossLength,
  }
}
/** Unit cross-section direction at around-angle `angle` for a section basis. */
export function sectionDirection(e1: Node<'vec3'>, e2: Node<'vec3'>, angle: Node<'float'> | number) {
  const a = typeof angle === 'number' ? float(angle) : angle
  return e1.mul(a.cos()).add(e2.mul(a.sin()))
}
