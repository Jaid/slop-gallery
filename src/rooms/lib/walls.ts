import type {Wall} from '#src/lib/placement/wallGeometry.ts'
import type {FloorSize, RoomWall} from '../base/Room.ts'
import type {Vec3} from 'math'

/** a side of a rectangular floor plan */
export type PlanSide = 'east' | 'north' | 'south' | 'west'

/** The wall along a side of a rectangular floor plan centered on the room’s origin, facing into the room, `height` high, with what else `wall` says about it. */
export function planWall([width, depth]: FloorSize, side: PlanSide, height: number, wall: Partial<RoomWall> = {}): RoomWall {
  const sides = {
    north: [0, -depth / 2, 0, width],
    east: [width / 2, 0, -Math.PI / 2, depth],
    south: [0, depth / 2, Math.PI, width],
    west: [-width / 2, 0, Math.PI / 2, depth],
  } as const
  const [x, z, rotation, length] = sides[side]
  return {
    center: [x, 0, z],
    rotation,
    width: length,
    height,
    ...wall,
  }
}

/** A room’s walls placed at its origin in world meters under their global ids, their holes in a list that keeps their names, as the placement code and the architecture take them. */
export function placeWalls(room: string, [x, y, z]: Vec3, walls: Iterable<readonly [string, RoomWall]>): Array<Wall> {
  const result: Array<Wall> = []
  for (const [id, {center, holes, ...wall}] of walls) {
    result.push({
      ...wall,
      id: `${room}-${id}`,
      room,
      center: [center[0] + x, center[1] + y, center[2] + z],
      ...holes ? {holes: Object.entries(holes).map(([name, hole]) => ({
        ...hole,
        name,
      }))} : {},
    })
  }
  return result
}

/**
 * Walls laid out in the museum’s meters as a room’s own, relative to its origin and by their ids within the room: the part of their global ids after the room’s id.
 * `holes` names the holes of each wall in their order, unless they carry their names already; every hole needs a name.
 */
export function localWalls(room: string, [x, y, z]: Vec3, walls: ReadonlyArray<Wall>, holes: Readonly<Record<string, ReadonlyArray<string>>> = {}) {
  const result: Record<string, RoomWall> = {}
  for (const {id, room: owner, center, holes: openings = [], miters: _, baseboardMiters: _baseboardMiters, ...wall} of walls) {
    if (owner !== room || !id.startsWith(`${room}-`)) {
      throw new Error(`The wall ${id} is not part of the ${room}.`)
    }
    const local = id.slice(room.length + 1)
    const names = holes[local] ?? openings.flatMap(({name}) => name ?? [])
    const unique = new Set(names)
    if (local in result || names.length !== openings.length || unique.size !== names.length) {
      throw new Error(`The wall ${id} needs an id of its own and a name of its own for every hole.`)
    }
    result[local] = {
      ...wall,
      center: [center[0] - x, center[1] - y, center[2] - z],
      ...openings.length ? {holes: Object.fromEntries(openings.map(({name: _name, ...hole}, index) => [names[index], hole]))} : {},
    }
  }
  return result
}
