import type {GalleryRoomId as RoomId} from '#src/worlds/gallery/index.ts'
import type {Wall, WallOpening} from '../../placement/wallGeometry.ts'
import type {Vec3} from '../types.ts'
import type {RoutePiece} from './PassageRoute.ts'

import {wallCoordinates} from '../../placement/wallGeometry.ts'
import PassageRoute from './PassageRoute.ts'

/** the box around a stretch of a passage’s air, from its lowest floor to its highest ceiling */
export type RouteChunk = {
  max: Vec3
  min: Vec3
}
/** an opening through the wall on one `side` of a routed passage, −1 its left and 1 its right, centered `along` meters down the route; its `width` runs along the wall, and its `bottom` and `height` stand over the floor there */
export type RouteOpening = Omit<WallOpening, 'name' | 'u'> & {
  along: number
  /** its name among the holes of its wall */
  name: string
  side: -1 | 1
}

/** At most this far apart along the route, the vault’s ribs stand evenly spaced, like those of straight passages. */
export const routeRibSpacing = 3.2
/** how far the first and the last rib stand in from the route’s ends */
const ribInset = 0.15
/** the steps in which a chunk of air grows around a turn, in meters along the centerline */
const chunkStep = 0.05

/**
 * An open-ended passage along a {@link PassageRoute} that winds through turns, may climb or fall and grow taller or lower along its runs, and may have openings in its walls: the same footprint drives its walls, floor and air.
 * Its runs take straight walls and its turns curved ones. A run that climbs or falls stands its walls level, from its lowest floor up to its highest ceiling, with their baseboards following the floor.
 */
export default class RoutedPassage {
  /** the room’s id followed by the passage’s own, which its walls’ ids start with */
  readonly name: string
  /** where the vault’s ribs stand, in meters along the route */
  readonly ribs: ReadonlyArray<number>
  /** a wall on each side of each of the route’s pieces in turn, the left one first */
  readonly walls: ReadonlyArray<Wall>

  constructor(readonly id: string, readonly room: RoomId, readonly route: PassageRoute, readonly width = 2.6, openings: ReadonlyArray<RouteOpening> = []) {
    if (!(width > 0) || route.pieces.some(piece => Math.min(piece.startHeight, piece.endHeight) <= width / 2 || piece.kind === 'arc' && piece.radius <= width / 2)) {
      throw new RangeError('A routed passage needs a positive width, room for its vault all along and turns wider than half of it.')
    }
    // Not an accessor: the build bakes the walls’ openings, and its evaluator leaves accessors out.
    this.name = `${room}-${id}`
    const count = Math.max(1, Math.ceil(route.length / routeRibSpacing))
    this.ribs = Array.from({length: count + 1}, (_, rib) => ribInset + (route.length - ribInset * 2) * rib / count)
    const walls: Array<Wall> = route.pieces.flatMap(piece => [-1, 1].map(side => this.wall(piece, side))).map((wall, index) => ({
      ...wall,
      id: `${this.name}_wall_${index}`,
    }))
    for (const {along, side, name, bottom = 0, height, ...opening} of openings) {
      const piece = route.pieces.findIndex(value => along >= value.from && along <= value.from + value.length)
      if (piece === -1) {
        throw new RangeError(`The opening ${name} lies beyond the ends of ${this.name}.`)
      }
      const wall = walls[piece * 2 + (side < 0 ? 0 : 1)]
      const station = route.at(along)
      const half = this.width / 2
      const foot = station.y - wall.center[1]
      wall.holes = [...wall.holes ?? [], {
        ...opening,
        name,
        u: wallCoordinates(wall, [station.point[0] - Math.sin(station.heading) * side * half, station.y, station.point[1] + Math.cos(station.heading) * side * half]),
        // A doorway down to the wall’s foot leaves its bottom out, so it cuts on below it instead of along it.
        ...foot + bottom > 0 ? {bottom: foot + bottom} : {},
        height: foot + height,
      }]
    }
    this.walls = walls
  }

  /** Boxes around the passage’s air, from its floor to its ceiling, each piece cut into as many as it takes for none to reach more than `slack` meters past the passage’s walls. */
  chunks(slack: number): Array<RouteChunk> {
    return this.route.pieces.flatMap(piece => {
      const result: Array<RouteChunk> = []
      let from = 0
      while (from < piece.length - 1e-9) {
        let to = Math.min(piece.length, from + chunkStep)
        while (to < piece.length && this.fits(piece, from, Math.min(piece.length, to + chunkStep), slack)) {
          to = Math.min(piece.length, to + chunkStep)
        }
        result.push(this.chunk(piece, from, to))
        from = to
      }
      return result
    })
  }

  /** Whether the position lies on the passage’s floor, from a meter under it to its ceiling. */
  contains([x, y, z]: Vec3) {
    const station = this.stationAt(x, z)
    return station !== undefined && y >= station.y - 1 && y <= station.y + station.height
  }

  /** The height of the floor under the point, or undefined beside the passage. */
  floorAt(x: number, z: number) {
    return this.stationAt(x, z)?.y
  }

  /** The middle between the two ribs around the point `along` meters down the route, where a lantern can hang from the bare vault. */
  ribGap(along: number) {
    const next = this.ribs.findIndex(rib => rib > along)
    if (next < 1) {
      throw new RangeError('A gap between ribs lies between the first and the last one.')
    }
    return (this.ribs[next - 1] + this.ribs[next]) / 2
  }

  /** The station of the route abreast of the point, or undefined beside the passage. */
  stationAt(x: number, z: number) {
    const projection = this.route.project(x, z)
    if (projection && Math.abs(projection.right) <= this.width / 2 + 1e-6) {
      return this.route.at(projection.along)
    }
  }

  /** The box around the floor plan of a stretch of a piece, from its lowest floor to its highest ceiling. */
  private chunk(piece: RoutePiece, from: number, to: number): RouteChunk {
    const half = this.width / 2
    const points = this.outline(piece, from, to, half)
    const ends = [from, to].map(offset => PassageRoute.station(piece, offset))
    return {
      min: [Math.min(...points.map(([x]) => x)), Math.min(...ends.map(({y}) => y)), Math.min(...points.map(([, z]) => z))],
      max: [Math.max(...points.map(([x]) => x)), Math.max(...ends.map(({y, height}) => y + height)), Math.max(...points.map(([, z]) => z))],
    }
  }

  /** Whether the box around the stretch keeps within `slack` of the passage’s walls. */
  private fits(piece: RoutePiece, from: number, to: number, slack: number) {
    const {min, max} = this.chunk(piece, from, to)
    const half = this.width / 2
    const corners = [[min[0], min[2]], [max[0], min[2]], [min[0], max[2]], [max[0], max[2]]] as const
    if (piece.kind === 'line') {
      const [rx, rz] = [-Math.sin(piece.heading), Math.cos(piece.heading)]
      return corners.every(([x, z]) => Math.abs((x - piece.start[0]) * rx + (z - piece.start[1]) * rz) <= half + slack)
    }
    const [cx, cz] = piece.center
    const nearest = Math.hypot(Math.min(Math.max(cx, min[0]), max[0]) - cx, Math.min(Math.max(cz, min[2]), max[2]) - cz)
    const farthest = Math.max(...corners.map(([x, z]) => Math.hypot(x - cx, z - cz)))
    return nearest >= piece.radius - half - slack && farthest <= piece.radius + half + slack
  }

  /** Points around the floor plan of a stretch of a piece, `half` meters to either side of the centerline, including where a turn’s edges reach furthest along x and z. */
  private outline(piece: RoutePiece, from: number, to: number, half: number) {
    const points: Array<readonly [number, number]> = []
    for (const offset of [from, to]) {
      const station = PassageRoute.station(piece, offset)
      for (const side of [-1, 1]) {
        points.push([station.point[0] - Math.sin(station.heading) * side * half, station.point[1] + Math.cos(station.heading) * side * half])
      }
    }
    if (piece.kind === 'arc') {
      const start = piece.startAngle + piece.sweep * from / piece.length
      const end = piece.startAngle + piece.sweep * to / piece.length
      const [low, high] = start < end ? [start, end] : [end, start]
      for (let angle = Math.ceil(low / (Math.PI / 2)) * Math.PI / 2; angle <= high; angle += Math.PI / 2) {
        points.push([piece.center[0] + Math.cos(angle) * (piece.radius + half), piece.center[1] + Math.sin(angle) * (piece.radius + half)])
      }
    }
    return points
  }

  /** The wall along one side of a piece, `side` −1 on its left and 1 on its right, facing into the passage. Like a room’s, it stops 30 cm short of the ceiling, here the vault’s crown. */
  private wall(piece: RoutePiece, side: number): Omit<Wall, 'id'> {
    const half = this.width / 2
    const common = {
      room: this.room,
      sticky: false,
      trimStyle: 'plain',
    } as const
    if (piece.kind === 'line') {
      const middle = PassageRoute.station(piece, piece.length / 2)
      const [dx, dz] = [Math.cos(piece.heading), Math.sin(piece.heading)]
      // It faces back across the passage, against the side it stands on.
      const rotation = Math.atan2(side * dz, -side * dx)
      const foot = Math.min(piece.startY, piece.endY)
      const top = Math.max(piece.startY + piece.startHeight, piece.endY + piece.endHeight)
      // A wall runs along its own +x, which turns toward −z as its rotation grows; this is where the piece starts on it.
      const start = -(dx * Math.cos(rotation) - dz * Math.sin(rotation)) * piece.length / 2
      return {
        ...common,
        center: [middle.point[0] - dz * side * half, foot, middle.point[1] + dx * side * half],
        rotation,
        width: piece.length,
        height: top - foot - 0.3,
        ...piece.startY === piece.endY ? {} : {baseboardProfile: ([[start, piece.startY - foot], [-start, piece.endY - foot]] as const).toSorted((a, b) => a[0] - b[0])},
      }
    }
    // A clockwise turn’s center lies on its right, where its wall runs closer to it.
    const radius = piece.radius - side * Math.sign(piece.sweep) * half
    const outer = radius > piece.radius
    const angle = piece.startAngle + piece.sweep / 2
    const [ux, uz] = [Math.cos(angle), Math.sin(angle)]
    // The outer wall faces the turn’s center, the inner one away from it.
    const [fx, fz] = outer ? [-ux, -uz] : [ux, uz]
    return {
      ...common,
      center: [piece.center[0] + ux * radius, piece.startY, piece.center[1] + uz * radius],
      rotation: Math.atan2(fx, fz),
      width: radius * Math.abs(piece.sweep),
      height: piece.startHeight - 0.3,
      curveRadius: outer ? radius : -radius,
    }
  }
}
