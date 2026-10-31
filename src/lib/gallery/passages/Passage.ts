import type {GalleryRoomId as RoomId} from '#src/worlds/gallery/index.ts'
import type {Wall} from '../../placement/wallGeometry.ts'
import type {FloorChunk, FloorPolygon} from '../floorPolygons.ts'
import type {Vec3} from '../types.ts'

import {wallCoordinates} from '../../placement/wallGeometry.ts'
import {wallFace} from '../architectureDimensions.ts'
import {floorChunks, insidePolygon} from '../floorPolygons.ts'

export type PassageCutout = {
  position: Vec3
  size: Vec3
}
/** a straight run of a passage’s path, from one of its points to the next */
export type PassageSpan = {
  end: Point
  /** how far into the span its open elbow at the start reaches, where its lining starts: 0 at the passage’s start */
  from: number
  length: number
  start: Point
  /** how far into the span its open elbow at the end begins, where its lining stops: its length at the passage’s end */
  to: number
}

type Point = readonly [number, number]

const tolerance = 1e-9
/** the direction to the right of a horizontal direction, seen from above with north up */
const rightOf = ([dx, dz]: Point): Point => [-dz, dx]
/** Where the segment crosses the rectangle from `min` to `max`, as shares of the way from its start to its end, or undefined if it misses it. */
function clipSegment(start: Point, end: Point, min: Point, max: Point) {
  let enter = 0
  let leave = 1
  for (const axis of [0, 1]) {
    const delta = end[axis] - start[axis]
    if (Math.abs(delta) < tolerance) {
      if (start[axis] < min[axis] || start[axis] > max[axis]) {
        return
      }
      continue
    }
    const [a, b] = [(min[axis] - start[axis]) / delta, (max[axis] - start[axis]) / delta]
    enter = Math.max(enter, Math.min(a, b))
    leave = Math.min(leave, Math.max(a, b))
  }
  return leave - enter > tolerance ? [enter, leave] as const : undefined
}

/**
 * An open-ended, level passage along a path of straight spans, each turning off the one before by up to a right angle at the points between them. One footprint drives its floors, walls and navigation.
 * Where two spans meet, an open elbow lies between the lines straight across them through the corner of the walls inside the turn, and the walls outside the turn meet in a corner of their own.
 * A room made of several passages tells them apart by their ids; one named like its room is the room’s only passage.
 */
export default class Passage {
  /** the convex pieces its floor is cut into: the straight stretch of each span between its elbows, if it has one, and the elbow after it */
  readonly floors: Array<FloorPolygon> = []
  /** the floors of the elbows, between the straight stretches of the spans */
  readonly junctions: Array<FloorPolygon> = []
  /** the room’s id, followed by the passage’s own unless it is the room’s only one, which its walls’ ids start with */
  readonly name: string
  readonly spans: Array<PassageSpan> = []
  /** the walls along its left side from its start to its end, then those along its right side */
  readonly walls: Array<Wall> = []

  constructor(readonly id: string, readonly room: RoomId, readonly path: ReadonlyArray<Point>, readonly floorY: number, readonly width = 2.6, readonly height = 3.4, readonly cutouts: ReadonlyArray<PassageCutout> = [], readonly cornice = true) {
    if (path.length < 2 || ![floorY, width, height, ...path.flat()].every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new RangeError('A passage needs at least two finite points and positive dimensions.')
    }
    if (cutouts.some(cutout => ![...cutout.position, ...cutout.size].every(Number.isFinite) || cutout.size.some(size => size <= 0))) {
      throw new RangeError('Passage cutouts need finite centers and positive dimensions.')
    }
    // Not an accessor: the build bakes the walls’ openings, and its evaluator leaves accessors out.
    this.name = id === room ? id : `${room}-${id}`
    const half = width / 2
    const directions = path.slice(1).map((end, i): Point => {
      const start = path[i]
      const length = Math.hypot(end[0] - start[0], end[1] - start[1])
      if (!(length > tolerance)) {
        throw new RangeError('A passage’s spans need a length.')
      }
      return [(end[0] - start[0]) / length, (end[1] - start[1]) / length]
    })
    // The turn at each point between two spans: positive to the right, seen from above with north up.
    const turns = directions.slice(1).map((after, i) => {
      const before = directions[i]
      return Math.atan2(before[0] * after[1] - before[1] * after[0], before[0] * after[0] + before[1] * after[1])
    })
    if (turns.some(turn => Math.abs(turn) < tolerance || Math.abs(turn) > Math.PI / 2 + tolerance)) {
      throw new RangeError('A passage turns by up to a right angle at each point between its spans.')
    }
    /** how far the open elbow at each point between two spans reaches into both, from the point: where the line straight across either through the corner inside the turn crosses its centerline */
    const elbows = turns.map(turn => half * Math.tan(Math.abs(turn) / 2))
    /** Where the walls on a side meet at each point of the path, on their center lines, −1 the left side and 1 the right. */
    const corners = (side: number) => path.map((point, i): Point => {
      const before = rightOf(directions[Math.max(i - 1, 0)])
      const after = rightOf(directions[Math.min(i, directions.length - 1)])
      // Mitered: as far off the point as it takes to stay half the width off both spans.
      const scale = side * half / (1 + before[0] * after[0] + before[1] * after[1])
      return [point[0] + (before[0] + after[0]) * scale, point[1] + (before[1] + after[1]) * scale]
    })
    const [left, right] = [corners(-1), corners(1)]
    for (const [i, direction] of directions.entries()) {
      const start = path[i]
      const end = path[i + 1]
      const length = Math.hypot(end[0] - start[0], end[1] - start[1])
      const span = {
        start,
        end,
        length,
        from: i > 0 ? elbows[i - 1] : 0,
        to: length - (i < elbows.length ? elbows[i] : 0),
      }
      if (span.to < span.from - tolerance) {
        throw new RangeError('A passage’s spans need to be long enough for the elbows at their ends.')
      }
      this.spans.push(span)
      const across = rightOf(direction)
      const at = (along: number, side: number): Point => [start[0] + direction[0] * along + across[0] * side * half, start[1] + direction[1] * along + across[1] * side * half]
      if (span.to - span.from > tolerance) {
        this.floors.push([at(span.from, -1), at(span.to, -1), at(span.to, 1), at(span.from, 1)])
      }
      if (i >= turns.length) {
        continue
      }
      // From the corner inside the turn across the span’s end of the elbow, round the corner outside it, and back across the next span’s start.
      const inside = Math.sign(turns[i])
      const next = directions[i + 1]
      const nextAcross = rightOf(next)
      const outer = inside > 0 ? left : right
      const inner = inside > 0 ? right : left
      const elbow: FloorPolygon = [inner[i + 1], at(span.to, -inside), outer[i + 1], [end[0] + next[0] * elbows[i] - nextAcross[0] * inside * half, end[1] + next[1] * elbows[i] - nextAcross[1] * inside * half]]
      this.floors.push(elbow)
      this.junctions.push(elbow)
    }
    for (const [side, points] of [[-1, left], [1, right]] as const) {
      for (const [i, [dx, dz]] of directions.entries()) {
        let start = points[i]
        let end = points[i + 1]
        // At the corner inside a turn, both walls end on their faces’ lines and leave the wedge between their ends open, exposing their end caps where linings and vaults end too.
        // Running each on by its thickness times the tangent of half the turn closes it; in a right angle, that’s the whole gap for one of them, which runs on alone instead of sharing its end face with the other’s face.
        const reach = (turn: number | undefined, outgoing: boolean) => {
          if (turn === undefined || Math.sign(turn) !== side) {
            return 0
          }
          if (Math.abs(Math.abs(turn) - Math.PI / 2) < tolerance) {
            return outgoing ? wallFace : 0
          }
          return wallFace * Math.tan(Math.abs(turn) / 2)
        }
        const before = reach(turns[i - 1], true)
        const after = reach(turns[i], false)
        start = [start[0] - dx * before, start[1] - dz * before]
        end = [end[0] + dx * after, end[1] + dz * after]
        const wall: Wall = {
          id: `${this.name}${id === room ? '-' : '_'}wall_${this.walls.length}`,
          room,
          center: [(start[0] + end[0]) / 2, floorY, (start[1] + end[1]) / 2],
          // It faces back across the passage, against the side it stands on.
          rotation: Math.atan2(side * dz, -side * dx),
          width: Math.hypot(end[0] - start[0], end[1] - start[1]),
          height: height - 0.3,
          sticky: false,
          trimStyle: 'plain',
          ...cornice ? {} : {cornice: false},
        }
        const holes = cutouts.flatMap(({position, size}) => {
          const along = clipSegment(start, end, [position[0] - size[0] / 2, position[2] - size[2] / 2], [position[0] + size[0] / 2, position[2] + size[2] / 2])
          if (!along) {
            return []
          }
          const [from, to] = along.map((share): Vec3 => [start[0] + (end[0] - start[0]) * share, floorY, start[1] + (end[1] - start[1]) * share])
          // The wall has to pass through the cutout, not only touch it.
          if (Math.abs((from[0] + to[0]) / 2 - position[0]) >= size[0] / 2 || Math.abs((from[2] + to[2]) / 2 - position[2]) >= size[2] / 2) {
            return []
          }
          return {
            u: (wallCoordinates(wall, from) + wallCoordinates(wall, to)) / 2,
            width: wall.width * (along[1] - along[0]),
            bottom: position[1] - size[1] / 2 - floorY,
            height: position[1] + size[1] / 2 - floorY,
            profile: 'rectangle' as const,
          }
        })
        this.walls.push(holes.length ? {
          ...wall,
          holes,
        } : wall)
      }
    }
  }

  /** Boxes around the passage’s air, from its floor to its ceiling, around each piece of its floor, see {@link floorChunks}. */
  chunks(slack: number): Array<FloorChunk> {
    return floorChunks(this.floors, this.floorY, this.height, slack)
  }

  contains([x, y, z]: Vec3) {
    return y >= this.floorY - 1 && y <= this.floorY + this.height && this.floorAt(x, z) !== undefined
  }

  floorAt(x: number, z: number) {
    return this.floors.some(floor => insidePolygon(floor, x, z)) ? this.floorY : undefined
  }
}
