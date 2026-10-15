import {knotSignParts, knotSignRoundParts} from 'knot-materials/signs.ts'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {BoxGeometry, CylinderGeometry, Euler, Matrix4} from 'three/webgpu'

import {circleSegments} from '#src/lib/geometry.ts'

const orientation = (rotation: [number, number, number] = [0, 0, 0]) => {
  const partOrientation = new Matrix4
  return partOrientation.makeRotationFromEuler(new Euler(...rotation))
}

/** The plaque backing and round stand parts, each tessellated to the same half-millimeter silhouette error. */
export default function createSupportGeometry() {
  const parts = [
    ...knotSignParts.map(({position, rotation, size}) => {
      const plaqueBacking = new BoxGeometry(...size)
      return plaqueBacking.applyMatrix4(orientation(rotation)).translate(...position)
    }),
    ...knotSignRoundParts.map(({position, rotation, radius, height, openEnded = false}) => {
      const roundStandPart = new CylinderGeometry(radius, radius, height, circleSegments(radius), 1, openEnded)
      return roundStandPart.applyMatrix4(orientation(rotation)).translate(...position)
    }),
  ]
  try {
    return mergeGeometries(parts)
  } finally {
    for (const part of parts) {
      part.dispose()
    }
  }
}
