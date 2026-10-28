import type {FloorRectangle} from '../floors.ts'
import type {Vec3} from '../types.ts'

import {BufferGeometry, Float32BufferAttribute} from 'three/webgpu'

import grainUvs from './grainUvs.ts'

export type SaddleOptions = {
  /** how far each beveled edge runs from the floor up to the top */
  bevel?: number
  /** height of the top above the floor */
  rise?: number
  /** how deep it reaches below the floor, taking the place of the floor it crosses */
  thickness?: number
}

/**
 * A timber door saddle: a board across a doorway that stands a few centimeters proud of the floor, with both long edges beveled down to it.
 *
 * It lies across x and centered on the origin, `depth` runs along z in the direction of travel and y = 0 is the floor. The grain runs across the doorway.
 */
export default class SaddleGeometry extends BufferGeometry {
  /** A saddle filling a floor rectangle on a floor at `floorY`, lying across the rectangle’s longer side. */
  static across({center: [x, z], size: [width, depth]}: FloorRectangle, floorY: number, options?: SaddleOptions) {
    const alongX = width >= depth
    const saddle = new SaddleGeometry(Math.max(width, depth), Math.min(width, depth), options)
    if (!alongX) {
      saddle.rotateY(Math.PI / 2)
    }
    return saddle.translate(x, floorY, z)
  }

  override readonly type = 'SaddleGeometry'

  constructor(width: number, depth: number, {bevel = 0.05, rise = 0.03, thickness = 0.24}: SaddleOptions = {}) {
    super()
    if (![width, depth, bevel, rise, thickness].every(value => Number.isFinite(value) && value > 0) || bevel * 2 >= depth) {
      throw new RangeError('A saddle needs finite, positive dimensions and bevels shorter than half its depth.')
    }
    const half = width / 2
    const front = depth / 2
    // The cross section as z and y, around the board from its bottom.
    const section = [[-front, -thickness], [front, -thickness], [front, 0], [front - bevel, rise], [bevel - front, rise], [-front, 0]] as const
    const centroid = section.reduce(([z, y], point) => [z + point[0] / section.length, y + point[1] / section.length], [0, 0])
    const positions: Array<number> = []
    /** A flat, convex face as a fan, wound to look toward `outward`. */
    const face = (corners: ReadonlyArray<Vec3>, outward: Vec3) => {
      const [a, b, c] = corners
      const u = b.map((value, i) => value - a[i])
      const v = c.map((value, i) => value - a[i])
      const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      const ordered = normal.reduce((sum, value, i) => sum + value * outward[i], 0) < 0 ? corners.toReversed() : corners
      for (let i = 1; i < ordered.length - 1; i++) {
        positions.push(...ordered[0], ...ordered[i], ...ordered[i + 1])
      }
    }
    for (const side of [-1, 1]) {
      face(section.map(([z, y]): Vec3 => [side * half, y, z]), [side, 0, 0])
    }
    for (const [i, [z1, y1]] of section.entries()) {
      const [z2, y2] = section[(i + 1) % section.length]
      // The cross section is convex, so its sides all look away from its centroid.
      face([[-half, y1, z1], [-half, y2, z2], [half, y2, z2], [half, y1, z1]], [0, (y1 + y2) / 2 - centroid[1], (z1 + z2) / 2 - centroid[0]])
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    // Every triangle has its own vertices, so the normals stay flat and every edge hard.
    this.computeVertexNormals()
    grainUvs(this, 0)
    this.computeBoundingBox()
    this.computeBoundingSphere()
  }
}
