import type {BufferGeometry} from 'three/webgpu'

import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js'
import {CylinderGeometry, LatheGeometry, Vector2, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {place, rod, roundedBox} from '../lodgeInterior/place.ts'
import {alchemyCannon, alchemyPipe, southWallFace} from './alchemyMachine.ts'

/** how far up the barrel from its breech its trunnions stand, a little behind its middle, where it balances */
export const trunnionReach = 0.36
/** the radius of the trunnions, and from how far out of the barrel’s axis to how far they reach, into their bearings */
const trunnion = [0.05, 0.2, 0.39] as const
/** how far out to either side of the barrel’s axis the bracket’s arms run back to the wall, just outside its trunnions */
const armX = 0.36
/** how much higher than the trunnions the bracket’s braces meet the wall */
const braceRise = 0.5
/**
 * The barrel of a bronze cannon round its bore, as a turned outline from its breech at y = 0 up to its muzzle: a ring round the end of the pipe at its breech, a base ring, a reinforce and its ring, the long chase with an astragal and the muzzle swell, then down the bore to the pipe’s end.
 * Each point is a radius and a height.
 */
function barrelOutline(length: number, bore: number, pipe: number): Array<Vector2> {
  const scale = length / 0.95
  const outline: Array<readonly [number, number]> = [
    [pipe, 0],
    [0.25, 0],
    [0.27, 0.02],
    [0.27, 0.08],
    [0.288, 0.09],
    [0.288, 0.13],
    [0.268, 0.14],
    [0.252, 0.4],
    [0.266, 0.41],
    [0.266, 0.45],
    [0.247, 0.46],
    [0.226, 0.8],
    [0.237, 0.81],
    [0.237, 0.83],
    [0.226, 0.84],
    [0.222, 0.86],
    [0.246, 0.915],
    [0.256, 0.935],
    [0.25, 0.95],
    [bore + 0.012, 0.95],
    [bore, 0.94],
    [bore, 0.04],
    [pipe, 0],
  ]
  return outline.map(([radius, y]) => new Vector2(radius, y * scale))
}

/**
 * The alchemy machine’s cannon, see {@link alchemyCannon}: its bronze `barrel` with its trunnions, in its own frame with its breech at the origin and its muzzle up the y axis, and its iron `bracket` in the world’s frame, a bearing round each trunnion on an arm straight back to the south wall and a brace up to it.
 */
export default class CannonGeometry {
  readonly barrel: BufferGeometry
  readonly bracket: BufferGeometry

  constructor() {
    const {axis, breech, bore, length} = alchemyCannon
    const turned = new LatheGeometry(barrelOutline(length, bore, alchemyPipe.radius + 0.01), 64)
    // Smoothed in centimeters, as the normal utility welds positions closer than 0.01 units; the rings keep their edges.
    const barrel = toCreasedNormals(turned.scale(100, 100, 100), Math.PI / 5).scale(0.01, 0.01, 0.01)
    turned.dispose()
    const [radius, from, to] = trunnion
    const pegs = [-1, 1].map(side => {
      const peg = new CylinderGeometry(radius, radius, to - from, 24)
      return place(peg.rotateZ(Math.PI / 2), side * (from + to) / 2, trunnionReach, 0)
    })
    this.barrel = mergeParts([barrel, ...pegs])
    const pivot = new Vector3(...breech)
    pivot.addScaledVector(new Vector3(...axis), trunnionReach)
    const parts: Array<BufferGeometry> = []
    for (const side of [-1, 1]) {
      const bearing = new Vector3(pivot.x + side * armX, pivot.y, pivot.z)
      const wall = new Vector3(bearing.x, bearing.y, southWallFace)
      const high = new Vector3(bearing.x, bearing.y + braceRise, southWallFace)
      parts.push(
        place(roundedBox([0.08, 0.13, 0.13], 0.012), bearing.x, bearing.y, bearing.z),
        rod(bearing, wall, 0.022, 10),
        rod(bearing, high, 0.018, 10),
        place(roundedBox([0.12, braceRise + 0.2, 0.02], 0.006), bearing.x, bearing.y + braceRise / 2, southWallFace - 0.01),
      )
    }
    this.bracket = mergeParts(parts)
  }

  dispose() {
    this.barrel.dispose()
    this.bracket.dispose()
  }
}
