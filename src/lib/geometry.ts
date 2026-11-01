import type {BufferGeometry} from 'three/webgpu'

export {mergeParts} from 'knot-materials/mergeParts.ts'

/** a point in a plane */
type Point = readonly [x: number, y: number]

/** Model triangles, counted once per mesh – not multiplied by shadows or material sides. */
export function triangleCount(geometry: BufferGeometry | null) {
  if (!geometry) {
    return 0
  }
  if (geometry.index) {
    return geometry.index.count / 3
  }
  return geometry.hasAttribute('position') ? geometry.getAttribute('position').count / 3 : 0
}

/** Fewest segments, in multiples of four, that keep a regular polygon within `tolerance` meters of its circle. */
export function circleSegments(radius: number, tolerance = 0.0005) {
  if (!(radius > 0) || !(tolerance > 0)) {
    throw new RangeError('Circle tessellation needs a positive radius and tolerance.')
  }
  const segments = Math.PI / Math.acos(1 - Math.min(1, tolerance / radius))
  return Math.max(8, Math.ceil(segments / 4) * 4)
}

/** Offsets a convex polygon of either winding inward by `distance`, outward for a negative one. */
export function insetPolygon(points: ReadonlyArray<Point>, distance: number): Array<[x: number, y: number]> {
  const area = points.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length]
    return sum + x * nextY - nextX * y
  }, 0)
  const orientation = Math.sign(area)
  return points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length]
    const next = points[(index + 1) % points.length]
    const edgeNormal = (from: Point, to: Point) => {
      const length = Math.hypot(to[0] - from[0], to[1] - from[1])
      return [-(to[1] - from[1]) / length * orientation, (to[0] - from[0]) / length * orientation] as Point
    }
    const a = edgeNormal(previous, point)
    const b = edgeNormal(point, next)
    const bisector: Point = [a[0] + b[0], a[1] + b[1]]
    const scale = distance / (1 + a[0] * b[0] + a[1] * b[1])
    return [point[0] + bisector[0] * scale, point[1] + bisector[1] * scale]
  })
}
