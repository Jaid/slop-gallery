import type {RouteStation} from './PassageRoute.ts'
import type RoutedPassage from './RoutedPassage.ts'

import {BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'

type Profile = ReadonlyArray<readonly [lateral: number, up: number]>

/** as thick as the vaults of the straight passages */
const shellThickness = 0.22
const ribDepth = 0.22
const ribThickness = 0.085
const pavingThickness = 0.24
/** An odd count leaves a level facet along the crown, wide enough for a lantern’s canopy to sit flush. */
const archSegments = 33
/** Turns are cut into steps of at most this many radians, like the curved walls beside them. */
const turnStep = 1 / 32
/** Points around an arch over the spring, from its left foot over its crown to its right foot, or back with `reverse`. */
function arch(radius: number, spring: number, reverse = false): Profile {
  const points = Array.from({length: archSegments + 1}, (_, i): readonly [number, number] => {
    const angle = Math.PI * (1 - i / archSegments)
    return [Math.cos(angle) * radius, spring + Math.sin(angle) * radius]
  })
  return reverse ? points.toReversed() : points
}
/**
 * A solid swept along stations of a route: each face of its closed cross section becomes a strip of its own, smooth along the route and across curved faces but creased between faces, and both ends are capped.
 * The cross section is given as faces in the order they follow around it, each a polyline from where the previous one ended, its heights over the floor or, `fromCrown`, over the passage’s crown.
 */
function sweep(stations: ReadonlyArray<RouteStation>, faces: ReadonlyArray<Profile>, fromCrown = false) {
  const place = ({point, heading, y, height}: RouteStation, [lateral, up]: readonly [number, number]) => [point[0] - Math.sin(heading) * lateral, y + (fromCrown ? height : 0) + up, point[1] + Math.cos(heading) * lateral] as const
  const outline = faces.flatMap(face => face.slice(1))
  // Walking along the route with the cross section ordered counterclockwise, as seen from behind, each quad’s corners need this order to face outward.
  const area = outline.reduce((sum, [l, v], i) => {
    const [nextL, nextV] = outline[(i + 1) % outline.length]
    return sum + l * nextV - nextL * v
  }, 0)
  const flip = area < 0
  const parts = faces.map(face => {
    const positions: Array<number> = []
    for (const station of stations) {
      for (const point of face) {
        positions.push(...place(station, point))
      }
    }
    const indices: Array<number> = []
    const columns = face.length
    for (let row = 0; row < stations.length - 1; row++) {
      for (let column = 0; column < columns - 1; column++) {
        const a = row * columns + column
        const b = a + 1
        const c = a + columns
        const d = c + 1
        indices.push(...flip ? [a, b, c, b, d, c] : [a, c, b, b, c, d])
      }
    }
    const strip = new BufferGeometry
    strip.setAttribute('position', new Float32BufferAttribute(positions, 3))
    strip.setIndex(indices)
    strip.computeVertexNormals()
    return strip
  })
  const triangles = ShapeUtils.triangulateShape(outline.map(([l, v]) => new Vector2(l, v)), [])
  for (const [index, station] of [stations[0], stations.at(-1)!].entries()) {
    const corners = outline.map(point => place(station, point))
    // The start’s cap looks back along the route, the end’s ahead.
    const facing = [Math.cos(station.heading) * (index ? 1 : -1), 0, Math.sin(station.heading) * (index ? 1 : -1)]
    const cap = new BufferGeometry
    cap.setAttribute('position', new Float32BufferAttribute(corners.flat(), 3))
    cap.setAttribute('normal', new Float32BufferAttribute(outline.flatMap(() => facing), 3))
    cap.setIndex(triangles.flatMap(([a, b, c]) => {
      const [u, v] = [b, c].map(corner => corners[corner].map((value, axis) => value - corners[a][axis]))
      const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      return normal[0] * facing[0] + normal[2] * facing[2] > 0 ? [a, b, c] : [a, c, b]
    }))
    parts.push(cap)
  }
  return parts
}

/**
 * The stone barrel vault, its ribs and its paving swept along a {@link RoutedPassage}, in world space.
 * Like the straight passages’ vaults, the barrel springs from behind the walls’ faces, `width / 2` off the centerline, and its crown reaches the passage’s height, wherever that changes.
 */
export default class RouteVaultGeometry {
  /** the slab under the floor, flush with the passage’s walls */
  readonly paving: BufferGeometry
  readonly ribs: BufferGeometry
  readonly shell: BufferGeometry

  constructor(passage: RoutedPassage) {
    const {route, width} = passage
    const radius = width / 2
    // under the crown
    const spring = -radius
    const stations = route.stations(0, route.length, turnStep)
    // Inner arch from left to right, the right foot, the outer arch back and the left foot.
    const ring = (inner: number, outer: number): Array<Profile> => [
      arch(inner, spring),
      [[inner, spring], [outer, spring]],
      arch(outer, spring, true),
      [[-outer, spring], [-inner, spring]],
    ]
    this.shell = mergeParts(sweep(stations, ring(radius, radius + shellThickness), true))
    this.ribs = mergeParts(passage.ribs.flatMap(along => sweep(route.stations(along - ribDepth / 2, along + ribDepth / 2, turnStep), ring(radius - ribThickness, radius), true)))
    this.paving = mergeParts(sweep(stations, [
      [[-radius, 0], [radius, 0]],
      [[radius, 0], [radius, -pavingThickness]],
      [[radius, -pavingThickness], [-radius, -pavingThickness]],
      [[-radius, -pavingThickness], [-radius, 0]],
    ]))
  }

  dispose() {
    this.shell.dispose()
    this.ribs.dispose()
    this.paving.dispose()
  }
}
