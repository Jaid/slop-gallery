import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, Vector3} from 'three/webgpu'

/** Bend local X around a vertical axis at Z = radius, preserving sharp profile edges. */
export function bendGeometry(geometry: BufferGeometry, radius: number) {
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal')
  const normal = new Vector3
  for (let i = 0; i < positions.count; i++) {
    const angle = positions.getX(i) / radius
    const depth = positions.getZ(i)
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)
    positions.setXYZ(i, (radius - depth) * sin, positions.getY(i), radius - (radius - depth) * cos)
    // Inverse-transpose of the bend Jacobian, not averaged triangle normals:
    // smooth around the bend, hard at the edges and tangent at both joins.
    normal.fromBufferAttribute(normals, i)
    normal.x /= 1 - depth / radius
    normals.setXYZ(i, normal.x * cos - normal.z * sin, normal.y, normal.x * sin + normal.z * cos)
    normal.fromBufferAttribute(normals, i).normalize()
    normals.setXYZ(i, normal.x, normal.y, normal.z)
  }
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function curveSegments(width: number, radius: number) {
  return Math.max(1, Math.ceil(Math.abs(width / radius) * 32))
}

/** A closed, rectangular-section circular beam; signed radius selects the bend direction. */
export default class CurvedBoxGeometry extends BoxGeometry {
  constructor(width: number, height: number, depth: number, radius: number) {
    if (![width, height, depth, radius].every(Number.isFinite) || Math.min(width, height, depth) <= 0 || Math.abs(radius) <= depth / 2 || width / Math.abs(radius) > Math.PI * 2) {
      throw new RangeError('A curved box needs positive dimensions, a radius outside its section and at most one revolution.')
    }
    super(width, height, depth, curveSegments(width, radius))
    bendGeometry(this, radius)
  }
}
