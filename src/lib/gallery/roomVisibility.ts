import type {RoomId, Vec3} from './types.ts'
import type {Frustum, Sphere} from 'three/webgpu'

import {Box3, Vector3} from 'three/webgpu'

import lobby from './lobby.ts'
import walls, {openingTop, rooms, wallPosition} from './walls.ts'

type Portal = {
  box: Box3
  rooms: readonly [RoomId, RoomId]
}

// Doorframes, trims and the reveal of thick walls stay inside the portal.
const portalDepth = 0.8
const containmentMargin = 0.05
/** the openings between rooms, as wall ids with an index into their holes; passages list the holes at both of their ends */
const openings: Array<{
  holes: Array<readonly [string, number]>
  rooms: readonly [RoomId, RoomId]
}> = [
  {
    rooms: ['lobby', 'vesper'],
    holes: [['lobby-west', 0]],
  },
  {
    rooms: ['lobby', 'dine'],
    holes: [['lobby-east', 0]],
  },
  {
    rooms: ['lobby', 'antechamber'],
    holes: [['lobby-south', 0]],
  },
  {
    rooms: ['vesper', 'sienna'],
    holes: [['vesper-south', 0]],
  },
  {
    rooms: ['dine', 'salon'],
    holes: [['dine-north', 0]],
  },
  {
    rooms: ['antechamber', 'moonfall'],
    holes: [['antechamber-east', 0], ['moonfall-east', 0]],
  },
  {
    rooms: ['sienna', 'corridor'],
    holes: [['sienna-west', 0]],
  },
  {
    rooms: ['moonfall', 'oculus'],
    holes: [['moonfall-north', 0], ['oculus-south', 0]],
  },
  {
    rooms: ['oculus', 'lodge'],
    holes: [['oculus-north', 0], ['lodge-east', 0]],
  },
  {
    rooms: ['lodge', 'corridor'],
    holes: [['lodge-west', 0]],
  },
  {
    rooms: ['lodge', 'corridor'],
    holes: [['lodge-west', 1], ['corridor-wall-5', 0]],
  },
]
const holeBox = (wallId: string, index: number) => {
  const wall = walls.find(value => value.id === wallId)
  const hole = wall?.holes?.[index]
  if (!wall || !hole) {
    throw new Error(`Wall ${wallId} has no opening ${index}.`)
  }
  const bottom = wall.center[1] + (hole.bottom ?? 0)
  const top = wall.center[1] + openingTop(hole, hole.u)
  const box = new Box3
  for (const u of [hole.u - hole.width / 2, hole.u + hole.width / 2]) {
    for (const offset of [-portalDepth, portalDepth]) {
      // The floor mirrors the opening below its surface, and the reflection must show what lies behind it too.
      for (const y of [bottom - (top - bottom), top]) {
        box.expandByPoint(new Vector3(...wallPosition(wall, u, y, offset)))
      }
    }
  }
  return box
}

export const portals: Array<Portal> = [
  ...openings.map(({rooms: pair, holes}) => ({
    rooms: pair,
    box: holes.map(([wallId, index]) => holeBox(wallId, index)).reduce((a, b) => a.union(b)),
  })),
  {
    // The glazed Lobby floor looks down into the Oculus.
    rooms: ['lobby', 'oculus'],
    box: new Box3(new Vector3(lobby.opening.center[0] - lobby.opening.size[0] / 2, -1, lobby.opening.center[1] - lobby.opening.size[1] / 2), new Vector3(lobby.opening.center[0] + lobby.opening.size[0] / 2, 0.5, lobby.opening.center[1] + lobby.opening.size[1] / 2)),
  },
]

export const roomBoxes = rooms.map(room => ({
  id: room.id,
  box: new Box3(new Vector3(room.center[0] - room.size[0] / 2, room.floorY - 1, room.center[1] - room.size[1] / 2), new Vector3(room.center[0] + room.size[0] / 2, room.floorY + room.height + 0.2, room.center[1] + room.size[1] / 2)),
}))

const point = new Vector3

/** the room whose box contains the position; undefined in passages between rooms and where boxes overlap */
export function roomContaining([x, y, z]: Vec3) {
  point.set(x, y, z)
  let result: RoomId | undefined
  for (const {id, box} of roomBoxes) {
    if (!box.containsPoint(point)) {
      continue
    }
    if (result) {
      return
    }
    result = id
  }
  return result
}

/** the room whose box holds the whole sphere; undefined for anything that reaches past one room, like shared walls */
export function roomEnclosing(sphere: Sphere) {
  let result: RoomId | undefined
  for (const {id, box} of roomBoxes) {
    const {center, radius} = sphere
    const r = radius + containmentMargin
    if (center.x - r < box.min.x || center.x + r > box.max.x || center.y - r < box.min.y || center.y + r > box.max.y || center.z - r < box.min.z || center.z + r > box.max.z) {
      continue
    }
    if (result) {
      return
    }
    result = id
  }
  return result
}

/**
 * The rooms the camera can see from its room: a neighbor counts when the opening to it lies in the frustum, and a room behind a neighbor when both openings do.
 * Line of sight never reaches three openings deep in the gallery.
 */
export function visibleRooms(room: RoomId, frustum: Frustum) {
  const result = new Set<RoomId>([room])
  const through = (from: RoomId, depth: number) => {
    for (const portal of portals) {
      const index = portal.rooms.indexOf(from)
      if (index === -1 || !frustum.intersectsBox(portal.box)) {
        continue
      }
      const next = portal.rooms[1 - index]
      if (next === room) {
        continue
      }
      result.add(next)
      if (depth > 1) {
        through(next, depth - 1)
      }
    }
  }
  through(room, 2)
  return result
}
