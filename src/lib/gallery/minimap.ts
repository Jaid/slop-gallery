import type {Portrait, RoomId, Vec3} from './types.ts'

import portraitObjects from './portraitObjects.ts'
import walls, {roomAt, rooms, wallPosition} from './walls.ts'

export const isLowerRoom = (id: RoomId) => rooms.find(room => room.id === id)!.floorY < 0
export const minimapHeading = ([x, , z]: Vec3) => Math.atan2(x, -z) * 180 / Math.PI

export function minimapPortrait(portrait: Portrait) {
  const physical = portraitObjects.get(portrait.id)?.body.translation()
  const position: Vec3 = physical ? [physical.x, physical.y, physical.z] : portrait.position
  const wall = portrait.hung ? walls.find(wall => wall.id === portrait.wallId) : undefined
  return {
    position,
    lower: isLowerRoom(wall?.room ?? roomAt(position)),
  }
}

// Project the actual walls, including curved walls and walk-through openings.
export const minimapWalls = walls.flatMap(wall => {
  let ranges: Array<[number, number]> = [[-wall.width / 2, wall.width / 2]]
  for (const hole of wall.holes ?? []) {
    if ((hole.bottom ?? 0) > 0) {
      continue
    }
    const left = hole.u - hole.width / 2
    const right = hole.u + hole.width / 2
    ranges = ranges.flatMap(([start, end]) => {
      if (right <= start || left >= end) {
        return [[start, end]]
      }
      const remaining: Array<[number, number]> = [[start, Math.max(start, left)], [Math.min(end, right), end]]
      return remaining.filter(([a, b]) => b > a)
    })
  }
  return ranges.map(([start, end]) => {
    const steps = wall.curveRadius ? Math.max(2, Math.ceil((end - start) / 0.5)) : 1
    const points = Array.from({length: steps + 1}, (_, i) => wallPosition(wall, start + (end - start) * i / steps, 0, 0))
    return {
      lower: isLowerRoom(wall.room),
      points,
      path: points.map(([x, , z]) => `${x},${z}`).join(' '),
    }
  })
})

const points = minimapWalls.flatMap(wall => wall.points)
const minX = Math.min(...points.map(p => p[0])) - 3
const minZ = Math.min(...points.map(p => p[2])) - 3
export const minimapViewBox = [minX, minZ, Math.max(...points.map(p => p[0])) + 3 - minX, Math.max(...points.map(p => p[2])) + 3 - minZ].join(' ')
