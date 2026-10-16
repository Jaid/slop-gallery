import type {BufferGeometry} from 'three/webgpu'

import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {CylinderGeometry, Quaternion, Vector3} from 'three/webgpu'

/** Moves a freshly built part to `[x, y, z]`, returning it for merging. */
export function place<T extends BufferGeometry>(geometry: T, x: number, y: number, z: number) {
  return geometry.translate(x, y, z)
}

/** A box with rounded edges whose radius never exceeds half its thinnest side. */
export function roundedBox([width, height, depth]: [number, number, number], radius: number, segments = 3) {
  return new RoundedBoxGeometry(width, height, depth, segments, Math.min(radius, width / 2 - 0.001, height / 2 - 0.001, depth / 2 - 0.001))
}

/** A thin rod between two points, as a cylinder. */
export function rod(from: Vector3, to: Vector3, radius: number, radialSegments = 6) {
  const direction = to.clone().sub(from)
  const length = direction.length()
  if (!(length > 0)) {
    throw new RangeError('A rod needs two distinct ends.')
  }
  const geometry = new CylinderGeometry(radius, radius, length, radialSegments, 1)
  // Cylinders run along y; turn y onto the rod’s direction.
  const turn = new Quaternion
  geometry.applyQuaternion(turn.setFromUnitVectors(new Vector3(0, 1, 0), direction.divideScalar(length)))
  const middle = from.clone().add(to).multiplyScalar(0.5)
  return place(geometry, middle.x, middle.y, middle.z)
}
