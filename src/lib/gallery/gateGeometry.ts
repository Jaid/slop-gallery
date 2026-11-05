import type {Wall, WallOpening} from '../placement/wallGeometry.ts'

import {Matrix4} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {barredIron} from './BarredOpeningGeometry.ts'

/** The iron bars of a gate standing in an opening through a straight wall, with their bands and the strap round their `hatch`, if any, placed with the wall in world space. */
export default function gateGeometry({bands, hatch, hole, wall}: {
  bands: ReadonlyArray<number>
  hatch?: WallOpening
  hole: WallOpening
  wall: Pick<Wall, 'center' | 'rotation'>
}) {
  const place = new Matrix4
  place.makeRotationY(wall.rotation).setPosition(...wall.center)
  return mergeParts(barredIron(hole, bands, {hatch}).map(part => part.applyMatrix4(place)))
}
