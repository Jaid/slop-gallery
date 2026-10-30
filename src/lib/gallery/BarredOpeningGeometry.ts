import type {Wall, WallOpening} from '../placement/wallGeometry.ts'

import {BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, Matrix4, ShapeUtils, Vector2, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {openingArc, openingTop} from '../placement/wallGeometry.ts'
import {wallFace} from './architectureDimensions.ts'
import {bendGeometry, curveSegments, sliceAlongX} from './CurvedBoxGeometry.ts'

export type BarredOpeningOptions = {
  /** where the opening comes out at the back of the gap, in the wall’s own coordinates: wider than the opening, it splays through the gap like an embrasure; the opening itself if left out */
  back?: WallOpening
  /** the heights of the flat iron bands across the bars, over the wall’s foot */
  bands: ReadonlyArray<number>
  /** how far behind the wall’s center line the opening runs on, through the gap to the wall it meets there */
  depth: number
}
type Point = readonly [x: number, y: number, z: number]
type Triangle = readonly [Point, Point, Point]

/** how far in front of the wall’s center line the bars stand: halfway through its plaster, where the opening is just as wide as on the wall’s face */
export const barDepth = wallFace / 2
/** how far apart the bars stand, at most, along the wall’s center line */
const barSpacing = 0.15
const barRadius = 0.016
const bandHeight = 0.05
const bandThickness = 0.014
/** how deep the iron reaches into the stone around the opening */
const embed = 0.06
/** how far the reveal’s stone reaches past the opening, into the walls on both sides of the gap */
const margin = 0.25
/** the arches of the openings’ outlines are cut into as many chords as the walls’ cutters take */
const headDivisions = 128
/** The outline of an opening in the wall’s plane: along its bottom, then over its head from the right jamb to the left one, which closes it down to the bottom again. Openings of the same profile have outlines of as many points. */
function outline(hole: WallOpening) {
  const bottom = hole.bottom ?? 0
  const half = hole.width / 2
  const {radius, center} = openingArc(hole)
  const spring = Math.atan2(Math.sqrt(Math.max(0, radius ** 2 - half ** 2)), half)
  const head = Array.from({length: headDivisions + 1}, (_, i) => {
    if (hole.profile !== 'arch') {
      return new Vector2(hole.u + half - hole.width * i / headDivisions, hole.height)
    }
    const angle = spring + (Math.PI - spring * 2) * i / headDivisions
    return new Vector2(hole.u + Math.cos(angle) * radius, center + Math.sin(angle) * radius)
  })
  return [new Vector2(hole.u - half, bottom), new Vector2(hole.u + half, bottom), ...head]
}
/** where the points lie on average */
const centroid = (points: ReadonlyArray<Vector2>) => points.reduce((sum, point) => sum.add(point), new Vector2).multiplyScalar(1 / points.length)

/**
 * The iron bars in an opening through a wall, and the stone reveal that lines the opening on through the gap behind the wall to the wall it meets there, like the apse’s gate and windows through the Oculus’ wall and the Fortress’ behind it.
 * Both are built in the wall’s own frame, bent with it if it curves, and placed with it in world space.
 * The reveal lines the opening from the wall’s center line `depth` meters back, where the other wall’s center line lies, there as wide as the `back` opening; for an opening down to the floor, its sill fills the gap between both floors.
 * The bars stand in the wall itself, where the opening is no wider than on its face, splayed or not.
 */
export default class BarredOpeningGeometry {
  readonly bars: BufferGeometry
  readonly reveal: BufferGeometry

  constructor(wall: Pick<Wall, 'center' | 'curveRadius' | 'rotation' | 'width'>, hole: WallOpening, {bands, depth, back = hole}: BarredOpeningOptions) {
    const bottom = hole.bottom ?? 0
    const halfWidth = hole.width / 2
    const front = outline(hole)
    const rear = outline(back)
    if (hole.profile !== back.profile) {
      throw new RangeError('An opening and the back it splays out to need the same profile.')
    }
    const left = Math.min(hole.u - halfWidth, back.u - back.width / 2) - margin
    const right = Math.max(hole.u + halfWidth, back.u + back.width / 2) + margin
    const low = Math.min(bottom, back.bottom ?? 0) - margin
    const high = Math.max(openingTop(hole, hole.u), openingTop(back, back.u)) + margin
    const frame = [new Vector2(left, low), new Vector2(right, low), new Vector2(right, high), new Vector2(left, high)]
    const solid = new FacetedSolid
    // Its faces at the wall’s center line and at the back, the frame round the opening and round its back
    for (const [z, opening] of [[0, front], [-depth, rear]] as const) {
      const corners = [...frame, ...opening]
      solid.add(ShapeUtils.triangulateShape(frame, [opening]).map(([a, b, c]): Triangle => [a, b, c].map(index => [corners[index].x, corners[index].y, z] as const) as unknown as Triangle), new Vector3(0, 0, z ? -1 : 1))
    }
    // The frame’s sides facing away from its middle, and the opening’s, lofted from its outline on the wall to its back, facing into it
    const sides = [
      [frame.map(corner => [corner, corner] as const), centroid(frame), -1],
      [front.map((corner, i) => [corner, rear[i]] as const), centroid(front), 1],
    ] as const
    for (const [ring, middle, facing] of sides) {
      for (const [i, [nearA, farA]] of ring.entries()) {
        const [nearB, farB] = ring[(i + 1) % ring.length]
        const quad: Array<Point> = [[nearA.x, nearA.y, 0], [nearB.x, nearB.y, 0], [farB.x, farB.y, -depth], [farA.x, farA.y, -depth]]
        const toMiddle = middle.clone().sub(nearA.clone().add(nearB).multiplyScalar(0.5)).multiplyScalar(facing)
        solid.add([[quad[0], quad[1], quad[2]], [quad[0], quad[2], quad[3]]], new Vector3(toMiddle.x, toMiddle.y, 0))
      }
    }
    const reveal = solid.geometry()
    const count = Math.ceil(hole.width / barSpacing) - 1
    const bars = Array.from({length: count}, (_, i) => {
      const u = hole.u - halfWidth + hole.width * (i + 1) / (count + 1)
      const foot = bottom - embed
      const head = openingTop(hole, u) + embed
      const bar = new CylinderGeometry(barRadius, barRadius, head - foot, 8)
      return bar.translate(u, (foot + head) / 2, barDepth)
    })
    const bandWidth = hole.width + embed * 2
    const iron = [
      ...bars,
      ...bands.map(height => {
        const band = new BoxGeometry(bandWidth, bandHeight, bandThickness, wall.curveRadius ? curveSegments(bandWidth, wall.curveRadius) * 4 : 1)
        return band.translate(hole.u, height, barDepth)
      }),
    ]
    const place = new Matrix4
    place.makeRotationY(wall.rotation).setPosition(...wall.center)
    for (const part of [reveal, ...iron]) {
      if (wall.curveRadius) {
        if (part === reveal) {
          sliceAlongX(part, wall.width / curveSegments(wall.width, wall.curveRadius), -wall.width / 2)
        }
        bendGeometry(part, wall.curveRadius)
      }
      part.applyMatrix4(place)
    }
    this.reveal = mergeParts([reveal])
    this.bars = mergeParts(iron)
  }

  dispose() {
    this.reveal.dispose()
    this.bars.dispose()
  }
}

/** A solid of flat-shaded triangles, each wound so that it faces out of the solid. */
class FacetedSolid {
  readonly normals: Array<number> = []
  readonly positions: Array<number> = []

  /** Adds triangles, wound to face the side `outward` points to. */
  add(triangles: ReadonlyArray<Triangle>, outward: Vector3) {
    for (const corners of triangles) {
      const [a, b, c] = corners.map(corner => new Vector3(...corner))
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
      const facing = normal.dot(outward) < 0 ? [a, c, b] : [a, b, c]
      if (normal.dot(outward) < 0) {
        normal.negate()
      }
      for (const corner of facing) {
        this.positions.push(corner.x, corner.y, corner.z)
        this.normals.push(normal.x, normal.y, normal.z)
      }
    }
  }

  geometry() {
    const geometry = new BufferGeometry
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3))
    return geometry
  }
}
