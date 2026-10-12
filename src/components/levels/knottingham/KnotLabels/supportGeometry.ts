import {knotSignParts, knotSignRoundParts} from 'knot-materials/signs.ts'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {BoxGeometry, CylinderGeometry, Euler, Matrix4} from 'three/webgpu'

import {circleSegments} from '#src/lib/geometry.ts'

const orientation = (rotation: [number, number, number] = [0, 0, 0]) => (new Matrix4).makeRotationFromEuler(new Euler(...rotation))

/** The plaque backing and round stand parts, each tessellated to the same half-millimeter silhouette error. */
export default function createSupportGeometry() {
  const parts = [
    ...knotSignParts.map(({position, rotation, size}) => new BoxGeometry(...size).applyMatrix4(orientation(rotation)).translate(...position)),
    ...knotSignRoundParts.map(({position, rotation, radius, height, openEnded = false}) => new CylinderGeometry(radius, radius, height, circleSegments(radius), 1, openEnded).applyMatrix4(orientation(rotation)).translate(...position)),
  ]
  try {
    return mergeGeometries(parts)
  } finally {
    for (const part of parts) {
      part.dispose()
    }
  }
}
