import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js'
import {BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2} from 'three/webgpu'

/** [x, y] of a point of the cross-section */
export type SectionPoint = readonly [number, number]

const defaultSmoothAngle = 40 * Math.PI / 180

/**
 * A closed cross-section in the x/y plane, swept straight along z from `from` to `to` and capped flat at both ends.
 *
 * Unlike `ExtrudeGeometry`, which shades every side face flat, a turn between neighboring sides gentler than `smoothAngle` is shaded smooth, so a molded edge rolls its highlight over a round-over instead of breaking it into facets, while true arrises stay crisp. The section may wind either way and needs no repeated closing point. UVs run along the section’s perimeter and along z, both in meters.
 */
export default class ExtrudedProfileGeometry extends BufferGeometry {
  override readonly type = 'ExtrudedProfileGeometry'

  constructor(section: ReadonlyArray<SectionPoint>, from: number, to: number, {smoothAngle = defaultSmoothAngle}: {smoothAngle?: number} = {}) {
    super()
    if (section.length < 3 || section.some(point => !point.every(Number.isFinite))) {
      throw new RangeError('An extruded profile needs at least three finite points.')
    }
    if (!(to > from)) {
      throw new RangeError('An extruded profile needs a positive length.')
    }
    // Wind counterclockwise, so the outside lies to the right of travel and caps face along ±z.
    const points = ShapeUtils.isClockWise(section.map(([x, y]) => new Vector2(x, y))) ? section.toReversed() : [...section]
    const count = points.length
    const edges = points.map((start, index) => {
      const end = points[(index + 1) % count]
      const length = Math.hypot(end[0] - start[0], end[1] - start[1])
      if (!(length > 1e-9)) {
        throw new RangeError('An extruded profile needs distinct neighboring points.')
      }
      return {
        length,
        // Counterclockwise sections have their outside to the right of travel.
        normal: [(end[1] - start[1]) / length, -(end[0] - start[0]) / length] as const,
      }
    })
    const positions: Array<number> = []
    const normals: Array<number> = []
    const uvs: Array<number> = []
    const vertexNormal = (edge: number, corner: number) => {
      // `corner` is the point shared with the neighboring edge: 0 for the edge’s start, 1 for its end.
      const own = edges[edge].normal
      const other = edges[(edge + (corner ? 1 : -1) + count) % count].normal
      const angle = Math.acos(Math.min(1, Math.max(-1, own[0] * other[0] + own[1] * other[1])))
      if (angle >= smoothAngle) {
        return own
      }
      const length = Math.hypot(own[0] + other[0], own[1] + other[1])
      return [(own[0] + other[0]) / length, (own[1] + other[1]) / length] as const
    }
    let perimeter = 0
    for (const [index, edge] of edges.entries()) {
      const start = points[index]
      const end = points[(index + 1) % count]
      const startNormal = vertexNormal(index, 0)
      const endNormal = vertexNormal(index, 1)
      const quad = [
        [start, startNormal, from, perimeter],
        [end, endNormal, from, perimeter + edge.length],
        [end, endNormal, to, perimeter + edge.length],
        [start, startNormal, to, perimeter],
      ] as const
      for (const corner of [0, 1, 2, 0, 2, 3]) {
        const [[x, y], [nx, ny], z, u] = quad[corner]
        positions.push(x, y, z)
        normals.push(nx, ny, 0)
        uvs.push(u, z)
      }
      perimeter += edge.length
    }
    // Earcut’s winding is unspecified; turn every cap triangle counterclockwise first.
    const triangles = ShapeUtils.triangulateShape(points.map(([x, y]) => new Vector2(x, y)), []).map(([a, b, c]) => {
      const area = (points[b][0] - points[a][0]) * (points[c][1] - points[a][1]) - (points[c][0] - points[a][0]) * (points[b][1] - points[a][1])
      return area >= 0 ? [a, b, c] : [a, c, b]
    })
    for (const [z, facing] of [[from, -1], [to, 1]] as const) {
      for (const triangle of triangles) {
        for (const index of facing > 0 ? triangle : triangle.toReversed()) {
          const [x, y] = points[index]
          positions.push(x, y, z)
          normals.push(0, 0, facing)
          uvs.push(x, y)
        }
      }
    }
    const soup = new BufferGeometry
    soup.setAttribute('position', new Float32BufferAttribute(positions, 3))
    soup.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    soup.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    const welded = mergeVertices(soup, 1e-6)
    soup.dispose()
    this.setIndex(welded.index)
    for (const [name, attribute] of Object.entries(welded.attributes)) {
      this.setAttribute(name, attribute)
    }
    welded.dispose()
    this.computeBoundingBox()
    this.computeBoundingSphere()
  }
}
