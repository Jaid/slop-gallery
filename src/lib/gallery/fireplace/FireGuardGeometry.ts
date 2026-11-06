import type {BufferGeometry} from 'three/webgpu'

import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {LineCurve3, QuadraticBezierCurve3, TubeGeometry, Vector3} from 'three/webgpu'

import lodgeInterior from '../lodgeInterior/layout.ts'

const {hearth, raisedBed, guard} = lodgeInterior.fireplace
const bottom = hearth.size[1] + raisedBed.size[1]

/** A solid barrier prevents the player's capsule squeezing through the gaps between rods. */
export const guardBarrier = {
  halfExtents: [lodgeInterior.fireplace.openingHalfWidth, (guard.top - bottom) / 2, 0.075] as [number, number, number],
  position: [0, (bottom + guard.top) / 2, guard.footZ + guard.bow * 0.8] as [number, number, number],
}

/** The iron rods return to the firebox at both ends, bowing out toward the Lodge at waist height. */
export function guardDepth(y: number) {
  const t = (y - bottom) / (guard.top - bottom)
  return guard.footZ + 4 * guard.bow * t * (1 - t)
}

/** One merged draw call for the fireguard's bowed vertical bars and horizontal cross-rails. */
export default function createFireGuardGeometry() {
  const pieces: Array<BufferGeometry> = []
  for (let index = 0; index < guard.bars; index++) {
    const x = (index / (guard.bars - 1) - 0.5) * guard.width
    const curve = new QuadraticBezierCurve3(
      new Vector3(x, bottom, guard.footZ),
      new Vector3(x, (bottom + guard.top) / 2, guard.footZ + 2 * guard.bow),
      new Vector3(x, guard.top, guard.footZ),
    )
    pieces.push(new TubeGeometry(curve, 24, index === 0 || index === guard.bars - 1 ? 0.035 : 0.023, 8, false))
  }
  for (const [y, radius] of [[bottom + 0.07, 0.034], [guard.top - 0.05, 0.034]] as const) {
    const z = guardDepth(y)
    pieces.push(new TubeGeometry(new LineCurve3(
      new Vector3(-guard.width / 2 - 0.05, y, z),
      new Vector3(guard.width / 2 + 0.05, y, z),
    ), 1, radius, 8, false))
  }
  const geometry = mergeGeometries(pieces)
  for (const piece of pieces) {
    piece.dispose()
  }
  geometry.computeBoundingBox()
  return geometry
}
