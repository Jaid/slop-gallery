import type {Node} from 'three/webgpu'

import {bitangentView, normalViewGeometry, positionViewDirection, tangentView, uv, vec2, vec3} from 'three/tsl'

/** World length of the knot centerline (u) and of one turn around the tube (v). */
export const knotAlong = 5.4536
export const knotAround = 0.81649

/** A seamless lattice over the tube surface. `around` cells encircle the tube and the matching integer count runs along the knot, so cells are close to square in world space and every periodic pattern built from `grid` closes exactly at the UV seams. */
export function tubeGrid(around: number, stretch = 1) {
  const along = Math.round(around * knotAlong / knotAround * stretch)
  const period = [along, around] as const
  return {grid: uv().mul(vec2(along, around)), period,
    /** World size of a single cell edge, for converting grid distances into object units. */
    cell: knotAround / around}
}

/** View direction expressed in the surface's tangent frame: x along the knot, y around it, z out of the surface. */
export function tangentViewFrame() {
  const tangent = tangentView.normalize()
  const bitangent = vec3(bitangentView as unknown as Node<'vec3'>).normalize()
  const normal = normalViewGeometry.normalize()
  const V = positionViewDirection
  return {
    tangent,
    bitangent,
    normal,
    x: V.dot(tangent),
    y: V.dot(bitangent),
    z: V.dot(normal),
  }
}
