import type {FloorPolygon} from '../floorPolygons.ts'
import type {FloorRectangle} from '../floors.ts'

import {BufferGeometry, Float32BufferAttribute} from 'three/webgpu'

import {wallFace} from '../architectureDimensions.ts'
import {cutFloorOpening} from '../floorPolygons.ts'

/** the opening down to the floor a hollow sinks toward, in a wall running east and west or north and south */
export type HollowOutlet = {
  /** the middle of the opening on the wall’s center line, in plan */
  center: Point
  /** half the opening’s width between its jambs */
  half: number
  /** the direction through the opening from the floor the hollow sinks into, one of the four points of the compass */
  into: Point
}

export type HollowShape = {
  /** how far beyond the wall’s center line its lowest point lies, in the opening */
  beyond: number
  /** how deep it sinks at its lowest point */
  depth: number
  /** how far out from its lowest point it reaches, toward the floor in front of the wall */
  reach: number
  /** how fast it widens out beyond the opening’s jambs on its left and its right, seen facing into the opening, in meters across for every meter out from the wall’s face: 0 where a wall runs on out from the jamb */
  spread: readonly [left: number, right: number]
  /** how far out from the opening’s middle it reaches across at most, on its left and its right */
  width: readonly [left: number, right: number]
}
type Point = readonly [x: number, z: number]

/** how finely its surface is cut, in meters */
const step = 0.06
/** how far under the floor beyond the wall its surface runs, a little step down onto that floor */
const outletStep = 0.02
/** a bump from 1 in its middle down to 0, smoothly, at ±1 and beyond */
const bump = (s: number) => (Math.abs(s) < 1 ? (1 - s * s) ** 2 : 0)

/**
 * A hollow the paving of a level floor at `y` has sunk into in front of an opening down to the floor, deepest just beyond the opening, as though water had long drained off through it: whatever rolls across it runs down into the opening.
 * It sinks nowhere along the walls round it, only between the opening’s jambs, so the walls keep standing on the floor; in front of the wall it widens out as far as its `spread` lets it.
 * Floors it lies in lose the rectangle it takes up, see {@link FloorHollow.cut}, and its surface, which steps down onto the floor beyond the opening at {@link FloorHollow.outletY}, is a geometry of its own, see {@link FloorHollow.geometry}.
 */
export default class FloorHollow {
  /** the rectangle it takes up in plan, from the wall’s center line out to where it ends */
  readonly footprint: FloorRectangle
  /** how high the floor beyond the opening has to lie: a little lower than the hollow’s surface there */
  readonly outletY: number
  /** the direction to the right of `into`, seen from above with north up */
  private readonly right: Point

  constructor(readonly y: number, readonly outlet: HollowOutlet, readonly shape: HollowShape) {
    const {into: [ix, iz], half} = outlet
    if (Math.abs(Math.abs(ix) + Math.abs(iz) - 1) > 1e-9 || ix * iz !== 0) {
      throw new RangeError('A hollow sinks toward an opening through a wall running along a point of the compass.')
    }
    if (!(shape.depth > 0 && shape.reach > shape.beyond && shape.beyond >= 0 && half > 0 && shape.width.every(width => width >= half))) {
      throw new RangeError('A hollow needs a depth, an opening it’s at least as wide as, and to reach out in front of its wall.')
    }
    this.right = [-iz, ix]
    this.outletY = y - this.sink(...this.at(0, 0)) - outletStep
    // From the wall’s center line out to where it ends, from its left edge to its right.
    const out = shape.reach - shape.beyond
    const [left, right] = [this.wide(0, out), this.wide(1, out)]
    const corners = [this.at(-left, 0), this.at(right, out)]
    const min = [Math.min(corners[0][0], corners[1][0]), Math.min(corners[0][1], corners[1][1])]
    const max = [Math.max(corners[0][0], corners[1][0]), Math.max(corners[0][1], corners[1][1])]
    this.footprint = {
      center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2],
      size: [max[0] - min[0], max[1] - min[1]],
    }
  }

  /** The convex pieces of the polygon outside its footprint. */
  cut(polygon: FloorPolygon) {
    return cutFloorOpening(polygon, this.footprint)
  }

  /**
   * Its surface, facing up, in world space, with the paving’s metric UVs: sunk into the floor over its footprint, and the step down from its edge along the wall’s center line between the opening’s jambs to the floor beyond, facing through the opening.
   */
  geometry() {
    const {center: [cx, cz], size: [width, depth]} = this.footprint
    const columns = Math.ceil(width / step)
    const rows = Math.ceil(depth / step)
    const positions: Array<number> = []
    const indices: Array<number> = []
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const x = cx - width / 2 + width * column / columns
        const z = cz - depth / 2 + depth * row / rows
        positions.push(x, this.y - this.sink(x, z), z)
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const a = row * (columns + 1) + column
        const b = a + 1
        const c = a + columns + 1
        const d = c + 1
        // Wound to face up: x runs east, the rows south.
        indices.push(a, c, b, b, c, d)
      }
    }
    // The step down beyond the opening, its top along the surface’s edge.
    const {half, into: [ix, iz]} = this.outlet
    const segments = Math.ceil(half * 2 / step)
    const start = positions.length / 3
    for (let segment = 0; segment <= segments; segment++) {
      const [x, z] = this.at(-half + half * 2 * segment / segments, 0)
      positions.push(x, this.y - this.sink(x, z), z, x, this.outletY - 0.05, z)
    }
    // Wound to face through the opening, down onto the floor beyond: the step runs to the right along its top, down its face.
    const [rx, rz] = this.right
    const facing = rz * ix - rx * iz > 0
    for (let segment = 0; segment < segments; segment++) {
      const top = start + segment * 2
      const [bottom, nextTop, nextBottom] = [top + 1, top + 2, top + 3]
      indices.push(...facing ? [top, nextTop, bottom, nextTop, nextBottom, bottom] : [top, bottom, nextTop, nextTop, bottom, nextBottom])
    }
    const geometry = new BufferGeometry
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    const uv: Array<number> = []
    for (let i = 0; i < positions.length; i += 3) {
      uv.push(positions[i], -positions[i + 2])
    }
    geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    return geometry
  }

  /** How deep the floor has sunk at the point in plan: nowhere along the walls, deepest just beyond the opening. */
  sink(x: number, z: number) {
    const {center: [cx, cz], into: [ix, iz]} = this.outlet
    const {beyond, depth, reach} = this.shape
    // How far out in front of the wall’s center line, and how far to the right of the opening’s middle
    const out = -((x - cx) * ix + (z - cz) * iz)
    const across = (x - cx) * this.right[0] + (z - cz) * this.right[1]
    return depth * bump(across / this.wide(across < 0 ? 0 : 1, out)) * bump((out + beyond) / reach)
  }

  /** The point in plan `across` meters to the right of the opening’s middle and `out` meters out in front of the wall’s center line. */
  private at(across: number, out: number): Point {
    const {center: [cx, cz], into: [ix, iz]} = this.outlet
    return [cx + this.right[0] * across - ix * out, cz + this.right[1] * across - iz * out]
  }

  /** How far out from the opening’s middle it reaches across on its left (0) or its right (1), `out` meters out in front of the wall’s center line: as wide as the opening up to the wall’s face, then widening out as fast as it spreads, to its full width. */
  private wide(side: 0 | 1, out: number) {
    const {half} = this.outlet
    return Math.min(half + Math.max(0, out - wallFace) * this.shape.spread[side], this.shape.width[side])
  }
}
