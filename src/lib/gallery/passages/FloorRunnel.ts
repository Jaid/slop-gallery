import type {FloorPolygon} from '../floorPolygons.ts'
import type {Runnel} from './RoutedPassage.ts'

import {BufferGeometry, Float32BufferAttribute} from 'three/webgpu'

import {clipPolygon} from '../floorPolygons.ts'
import runnelSection from './runnelSection.ts'

type Point = readonly [x: number, z: number]

/** how many lengths its round inside is cut into along a meter where it shallows out */
const outletLengths = 8

/**
 * A straight runnel worn into a level floor at `y`, from `from` to `to` in plan, which carries on what a runnel ending at `from` brought there and shallows out up to the floor over its last `outlet` meters toward `to`.
 * Floors of the passage it runs through lose the strip it takes up, see {@link FloorRunnel.cut}, and its round inside is a surface of its own, see {@link FloorRunnel.geometry}.
 */
export default class FloorRunnel {
  /** the direction from its start to its end, along the floor */
  readonly along: Point
  readonly length: number

  constructor(readonly from: Point, readonly to: Point, readonly y: number, readonly runnel: Pick<Runnel, 'radius' | 'width'> & {outlet: number}) {
    this.length = Math.hypot(to[0] - from[0], to[1] - from[1])
    if (!(this.length > runnel.outlet && runnel.outlet > 0)) {
      throw new RangeError('A floor runnel needs to be longer than its outlet.')
    }
    this.along = [(to[0] - from[0]) / this.length, (to[1] - from[1]) / this.length]
  }

  /** The convex pieces of the polygon outside the strip the runnel takes up: beside it on both sides, and before and after its ends between them. */
  cut(polygon: FloorPolygon): Array<FloorPolygon> {
    const [dx, dz] = this.along
    const [rx, rz] = [-dz, dx]
    const half = this.runnel.width / 2
    const across = rx * this.from[0] + rz * this.from[1]
    const start = dx * this.from[0] + dz * this.from[1]
    const end = start + this.length
    const left = clipPolygon(polygon, [rx, rz], across - half)
    const right = clipPolygon(polygon, [-rx, -rz], -(across + half))
    const between = clipPolygon(clipPolygon(polygon, [-rx, -rz], -(across - half)), [rx, rz], across + half)
    const before = between.length ? clipPolygon(between, [dx, dz], start) : []
    const after = between.length ? clipPolygon(between, [-dx, -dz], -end) : []
    return [left, right, before, after].filter(piece => piece.length)
  }

  /** Its round inside, a surface facing up, in world space: straight from its start to where its outlet begins, then in lengths up to the floor at its end. */
  geometry() {
    const [dx, dz] = this.along
    const [rx, rz] = [-dz, dx]
    const {outlet} = this.runnel
    const count = Math.ceil(outlet * outletLengths)
    const offsets = [0, ...Array.from({length: count + 1}, (_, i) => this.length - outlet + outlet * i / count)]
    const columns = runnelSection(this.runnel).length
    const positions: Array<number> = []
    for (const offset of offsets) {
      const depth = Math.min(1, (this.length - offset) / outlet)
      for (const [lateral, up] of runnelSection(this.runnel, this.runnel.width, depth)) {
        positions.push(this.from[0] + dx * offset + rx * lateral, this.y + up, this.from[1] + dz * offset + rz * lateral)
      }
    }
    const indices: Array<number> = []
    for (let row = 0; row < offsets.length - 1; row++) {
      for (let column = 0; column < columns - 1; column++) {
        const a = row * columns + column
        const b = a + 1
        const c = a + columns
        const d = c + 1
        // Wound to face up: lateral runs to the right, the rows ahead.
        indices.push(a, b, c, b, d, c)
      }
    }
    const geometry = new BufferGeometry
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    return geometry
  }
}
