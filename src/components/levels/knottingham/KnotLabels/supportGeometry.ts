import {knotSignParts, knotSignRoundParts} from 'knot-materials/signs.ts'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {BoxGeometry, CylinderGeometry, Euler, Matrix4, Vector3} from 'three/webgpu'

import {circleSegments} from '#src/lib/geometry.ts'
import {setGrain} from '#src/lib/materials/metal/grain.ts'

const orientation = (rotation: [number, number, number] = [0, 0, 0]) => {
  const partOrientation = new Matrix4
  return partOrientation.makeRotationFromEuler(new Euler(...rotation))
}

/** The plaque backing and round stand parts, each tessellated to the same half-millimeter silhouette error and marked with the direction its metal was brushed or turned in. */
export default function createSupportGeometry() {
  const parts = [
    ...knotSignParts.map(({position, rotation, size}) => {
      const plaqueBacking = new BoxGeometry(...size)
      // Sheet metal brushed side to side, along the plaque’s width.
      return setGrain(plaqueBacking.applyMatrix4(orientation(rotation)).translate(...position), {
        kind: 'brushed',
        axis: [1, 0, 0],
      })
    }),
    ...knotSignRoundParts.map(({position, rotation, radius, height, openEnded = false}) => {
      const roundStandPart = new CylinderGeometry(radius, radius, height, circleSegments(radius), 1, openEnded)
      const axis = new Vector3(0, 1, 0)
      axis.applyEuler(new Euler(...rotation ?? [0, 0, 0]))
      // The slender stem is drawn and brushed along its length; the base, sleeve and boss are turned on a lathe.
      return setGrain(roundStandPart.applyMatrix4(orientation(rotation)).translate(...position), height > radius * 4 ? {
        kind: 'brushed',
        axis: axis.toArray(),
      } : {
        kind: 'turned',
        axis: axis.toArray(),
        center: position,
      })
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
