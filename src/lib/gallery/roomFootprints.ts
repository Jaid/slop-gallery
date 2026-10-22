import type {WorldRoom} from '../webmcp/analyzeWorld.ts'

import {corridorPassage, corridorStairs} from './corridor.ts'
import {roomClearHeight, rooms} from './walls.ts'

type Point = [number, number]
type Rectangle = {
  maxX: number
  maxZ: number
  minX: number
  minZ: number
}

// Snaps to 0.1 mm, so rectangles from different sources share their corners exactly.
const snap = (value: number) => Math.round(value * 1e4) / 1e4 + 0
const rectangle = (center: ArrayLike<number>, size: ArrayLike<number>): Rectangle => ({
  minX: snap(center[0] - size[0] / 2),
  maxX: snap(center[0] + size[0] / 2),
  minZ: snap(center[1] - size[1] / 2),
  maxZ: snap(center[1] + size[1] / 2),
})

/** The outline of a union of axis-aligned rectangles, clockwise seen from above (north is −z) from its north-west corner, without collinear points. */
export function outline(rectangles: ReadonlyArray<Rectangle>): Array<Point> {
  const xs = [...new Set(rectangles.flatMap(r => [r.minX, r.maxX]))].toSorted((a, b) => a - b)
  const zs = [...new Set(rectangles.flatMap(r => [r.minZ, r.maxZ]))].toSorted((a, b) => a - b)
  const occupied = (i: number, j: number) => i >= 0 && j >= 0 && i < xs.length - 1 && j < zs.length - 1 && rectangles.some(r => xs[i] >= r.minX && xs[i + 1] <= r.maxX && zs[j] >= r.minZ && zs[j + 1] <= r.maxZ)
  // Each boundary edge of an occupied cell, directed so the cell lies on its right with z pointing south.
  const next = new Map<string, Point>
  const key = ([x, z]: Point) => `${x},${z}`
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      if (!occupied(i, j)) {
        continue
      }
      const nw: Point = [xs[i], zs[j]]
      const ne: Point = [xs[i + 1], zs[j]]
      const se: Point = [xs[i + 1], zs[j + 1]]
      const sw: Point = [xs[i], zs[j + 1]]
      const edges: Array<[boolean, Point, Point]> = [[occupied(i, j - 1), nw, ne], [occupied(i + 1, j), ne, se], [occupied(i, j + 1), se, sw], [occupied(i - 1, j), sw, nw]]
      for (const [shared, from, to] of edges) {
        if (!shared) {
          next.set(key(from), to)
        }
      }
    }
  }
  const start = next.keys().map(value => value.split(',').map(Number) as Point).toArray().toSorted((a, b) => a[1] - b[1] || a[0] - b[0])[0]
  const ring: Array<Point> = [start]
  for (let point = next.get(key(start))!; key(point) !== key(start); point = next.get(key(point))!) {
    ring.push(point)
  }
  if (ring.length !== next.size) {
    throw new Error('The rectangles do not form one connected footprint without holes.')
  }
  return ring.filter((point, i) => {
    const previous = ring.at(i - 1)!
    const following = ring[(i + 1) % ring.length]
    return !(previous[0] === point[0] && point[0] === following[0] || previous[1] === point[1] && point[1] === following[1])
  })
}

/**
 * Every room’s floor footprint. All rooms are rectangles except the Corridor, which is its timber passage plus the stair flight up to the Sienna.
 * The height is the clear height above the floor, up to the vault crown in the Lobby.
 */
export const roomFootprints: ReadonlyArray<WorldRoom> = rooms.map(room => ({
  id: room.id,
  title: room.title,
  floorY: snap(room.floorY),
  height: snap(roomClearHeight(room)),
  polygon: room.id === 'corridor' ? outline([...corridorPassage.floors.map(floor => rectangle(floor.center, floor.size)), ...corridorStairs.blocks.map(block => rectangle([block.position[0], block.position[2]], [block.size[0], block.size[2]]))]) : outline([rectangle(room.center, room.size)]),
}))
