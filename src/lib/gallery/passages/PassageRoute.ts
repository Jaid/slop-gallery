/** a straight run of a route, optionally climbing or falling by `rise` meters over its length */
export type RouteRun = {
  length: number
  rise?: number
}

/** a level circular turn of a route, by `angle` radians around a center `radius` meters off its centerline; positive angles turn clockwise as seen from above, from north toward east */
export type RouteTurn = {
  angle: number
  radius: number
}
export type RouteStep = RouteRun | RouteTurn
/** a straight run from `start` along `heading` */
export type RouteLine = PieceBase & {
  heading: number
  kind: 'line'
  start: Point
}

/** a turn around `center`, starting at polar angle `startAngle` and sweeping by the signed `sweep` */
export type RouteArc = PieceBase & {
  center: Point
  kind: 'arc'
  radius: number
  startAngle: number
  sweep: number
}
export type RoutePiece = RouteArc | RouteLine
/** a point on a route’s centerline with the direction it runs in there and the floor’s height */
export type RouteStation = {
  /** the angle of the direction of travel in the floor plan, atan2 of its z and x */
  heading: number
  point: Point
  y: number
}
/** where a point of the floor plan lies relative to a route: how far along it, and how far to the right of its centerline */
export type RouteProjection = {
  along: number
  piece: RoutePiece
  right: number
}
type Point = readonly [x: number, z: number]
type PieceBase = {
  /** the floor height where the piece ends */
  endY: number
  /** how far along the route the piece starts */
  from: number
  /** its length along the centerline */
  length: number
  /** the floor height where the piece starts */
  startY: number
}

const tolerance = 1e-9
const direction = (heading: number): Point => [Math.cos(heading), Math.sin(heading)]
/** the direction to the right of a heading, seen from above with north up */
const rightOf = (heading: number): Point => [-Math.sin(heading), Math.cos(heading)]

/**
 * The centerline of a passage, laid out like a turtle walks: from a start point and heading, through straight runs and circular turns that each continue the last one’s direction.
 * Its floor height starts at `y` and changes along runs that rise or fall; turns stay level.
 */
export default class PassageRoute {
  /** The station `offset` meters into a piece. */
  static station(piece: RoutePiece, offset: number): RouteStation {
    const fraction = piece.length ? offset / piece.length : 0
    const y = piece.startY + (piece.endY - piece.startY) * fraction
    if (piece.kind === 'line') {
      const [dx, dz] = direction(piece.heading)
      return {
        point: [piece.start[0] + dx * offset, piece.start[1] + dz * offset],
        heading: piece.heading,
        y,
      }
    }
    const angle = piece.startAngle + piece.sweep * fraction
    return {
      point: [piece.center[0] + Math.cos(angle) * piece.radius, piece.center[1] + Math.sin(angle) * piece.radius],
      heading: angle + Math.sign(piece.sweep) * Math.PI / 2,
      y,
    }
  }

  private static projectOnto(piece: RoutePiece, x: number, z: number): RouteProjection | undefined {
    if (piece.kind === 'line') {
      const [dx, dz] = direction(piece.heading)
      const [rx, rz] = rightOf(piece.heading)
      const offset = (x - piece.start[0]) * dx + (z - piece.start[1]) * dz
      if (offset < -tolerance || offset > piece.length + tolerance) {
        return
      }
      return {
        piece,
        along: piece.from + Math.min(Math.max(offset, 0), piece.length),
        right: (x - piece.start[0]) * rx + (z - piece.start[1]) * rz,
      }
    }
    const distance = Math.hypot(x - piece.center[0], z - piece.center[1])
    // How far the point has come around the center, in the direction the arc sweeps.
    const turned = Math.sign(piece.sweep) * (Math.atan2(z - piece.center[1], x - piece.center[0]) - piece.startAngle)
    const swept = (turned % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
    const sweep = Math.abs(piece.sweep)
    // Just before the start, the angle wraps around to almost a full turn.
    const angle = swept > Math.PI * 2 - tolerance ? 0 : swept
    if (angle > sweep + tolerance / piece.radius) {
      return
    }
    return {
      piece,
      along: piece.from + Math.min(angle, sweep) * piece.radius,
      // A clockwise turn has its center on the right.
      right: Math.sign(piece.sweep) * (piece.radius - distance),
    }
  }

  /** the floor height and direction where the route ends */
  readonly end: RouteStation
  readonly length: number
  readonly pieces: ReadonlyArray<RoutePiece>

  constructor(readonly start: Point, readonly heading: number, readonly y: number, readonly steps: ReadonlyArray<RouteStep>) {
    if (!steps.length || ![...start, heading, y].every(Number.isFinite)) {
      throw new RangeError('A route needs a finite start, heading and height and at least one step.')
    }
    const pieces: Array<RoutePiece> = []
    let point = start
    let current = heading
    let height = y
    let along = 0
    for (const step of steps) {
      if ('length' in step) {
        const rise = step.rise ?? 0
        if (!(step.length > 0) || !Number.isFinite(rise)) {
          throw new RangeError('A route’s runs need a positive length and a finite rise.')
        }
        pieces.push({
          kind: 'line',
          start: point,
          heading: current,
          from: along,
          length: step.length,
          startY: height,
          endY: height + rise,
        })
        const [dx, dz] = direction(current)
        point = [point[0] + dx * step.length, point[1] + dz * step.length]
        height += rise
        along += step.length
        continue
      }
      if (!(step.radius > 0) || !Number.isFinite(step.angle) || Math.abs(step.angle) < tolerance || Math.abs(step.angle) > Math.PI * 2) {
        throw new RangeError('A route’s turns need a positive radius and a finite angle of at most one revolution.')
      }
      const side = Math.sign(step.angle)
      const [rx, rz] = rightOf(current)
      const center: Point = [point[0] + rx * side * step.radius, point[1] + rz * side * step.radius]
      const startAngle = Math.atan2(point[1] - center[1], point[0] - center[0])
      const length = Math.abs(step.angle) * step.radius
      pieces.push({
        kind: 'arc',
        center,
        radius: step.radius,
        startAngle,
        sweep: step.angle,
        from: along,
        length,
        startY: height,
        endY: height,
      })
      point = [center[0] + Math.cos(startAngle + step.angle) * step.radius, center[1] + Math.sin(startAngle + step.angle) * step.radius]
      current += step.angle
      along += length
    }
    this.pieces = pieces
    this.length = along
    this.end = {
      point,
      heading: current,
      y: height,
    }
  }

  /** The station `along` meters down the route, clamped to its ends. */
  at(along: number): RouteStation {
    const distance = Math.min(Math.max(along, 0), this.length)
    const piece = this.pieces.find(value => distance <= value.from + value.length + tolerance) ?? this.pieces.at(-1)!
    return PassageRoute.station(piece, distance - piece.from)
  }

  /** Where the point lies relative to the nearest piece whose span it lies beside, or undefined beside none of them. */
  project(x: number, z: number): RouteProjection | undefined {
    let best: RouteProjection | undefined
    for (const piece of this.pieces) {
      const projection = PassageRoute.projectOnto(piece, x, z)
      if (projection && (!best || Math.abs(projection.right) < Math.abs(best.right))) {
        best = projection
      }
    }
    return best
  }

  /** Stations between two distances along the route: where they start and end, at every joint between its pieces and in steps of at most `turnStep` radians around its turns. */
  stations(from: number, to: number, turnStep: number) {
    const stations: Array<RouteStation> = []
    for (const piece of this.pieces) {
      const start = Math.max(from, piece.from)
      const end = Math.min(to, piece.from + piece.length)
      if (end <= start) {
        continue
      }
      const steps = piece.kind === 'arc' ? Math.max(1, Math.ceil(Math.abs(piece.sweep) * (end - start) / piece.length / turnStep)) : 1
      for (let step = stations.length ? 1 : 0; step <= steps; step++) {
        stations.push(PassageRoute.station(piece, start - piece.from + (end - start) * step / steps))
      }
    }
    return stations
  }
}
