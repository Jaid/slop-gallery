import type {RoomId, Vec3} from './types.ts'
import type {Frustum, Matrix4, Sphere} from 'three/webgpu'

import {Box3, Vector3} from 'three/webgpu'

import lobby from './lobby.ts'
import walls, {openingTop, rooms, wallPosition} from './walls.ts'
import {worldRooms} from './worldRooms.ts'

/** a rectangle on screen in normalized device coordinates: left, bottom, right, top */
export type ScreenRect = readonly [number, number, number, number]
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
  {
    // The glass wall between the Lobby extension and the Salon.
    rooms: ['lobby', 'salon'],
    holes: [['lobby-extension-east', 0], ['salon-west', 0]],
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

/** the boxes fencing each room, a room’s fence can take several (like the Corridor’s hall and its stair flight up to the Sienna); they reach below the floor for its reflection */
export const roomBoxes = rooms.flatMap(({id, floorY}) => {
  const {fence} = worldRooms.find(room => room.id === id)!
  return [fence].flat().map(({min, max}) => ({
    id,
    floorY,
    box: new Box3(new Vector3(min[0], min[1] - 1, min[2]), new Vector3(max[0], max[1] + 0.2, max[2])),
  }))
})

const point = new Vector3

/** the room whose box contains the position; undefined in passages between rooms and where boxes overlap */
export function roomContaining([x, y, z]: Vec3) {
  point.set(x, y, z)
  let result: RoomId | undefined
  for (const {id, box} of roomBoxes) {
    if (!box.containsPoint(point)) {
      continue
    }
    if (result && result !== id) {
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
    if (result && result !== id) {
      return
    }
    result = id
  }
  return result
}

/** rooms that look into a room behind a neighbor only in theory, along lines too grazing for its lights to matter, as viewer, the room between and the room behind */
const blindSightlines: ReadonlyArray<readonly [RoomId, RoomId, RoomId]> = [
  ['vesper', 'sienna', 'corridor'],
  ['sienna', 'corridor', 'lodge'],
  ['lodge', 'corridor', 'sienna'],
  ['corridor', 'lodge', 'oculus'],
  ['oculus', 'lodge', 'corridor'],
]
const sightlines = new Map<string, ReadonlyArray<RoomId>>
const neighbors = (room: RoomId) => portals.filter(portal => portal.rooms.includes(room)).map(portal => portal.rooms[1 - portal.rooms.indexOf(room)])
/**
 * A room and the rooms that look into it through up to two openings, as far as {@link visibleRooms} reaches: where the player must be for a light inside it to matter.
 * Hidden rooms are left out, and so are the rooms that would only look in through them. The same arguments always give the same list.
 */
export function seenFrom(room: RoomId, ...hidden: Array<RoomId>) {
  const key = [room, ...hidden].join()
  let result = sightlines.get(key)
  if (!result) {
    const near = neighbors(room).filter(next => !hidden.includes(next))
    const far = near.flatMap(through => neighbors(through).filter(next => !hidden.includes(next) && !blindSightlines.some(([viewer, middle, behind]) => viewer === next && middle === through && behind === room)))
    result = [...new Set([room, ...near, ...far])]
    sightlines.set(key, result)
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

/** the rooms whose boxes contain the position, and in a passage the rooms on both of its ends */
export function roomsAt([x, y, z]: Vec3) {
  point.set(x, y, z)
  const result = new Set<RoomId>
  for (const {id, box} of roomBoxes) {
    if (box.containsPoint(point)) {
      result.add(id)
    }
  }
  if (!result.size) {
    for (const portal of portals) {
      if (portal.box.containsPoint(point)) {
        for (const room of portal.rooms) {
          result.add(room)
        }
      }
    }
  }
  return [...result]
}

/**
 * The rooms an object with these world bounds can show up in: every room whose box it overlaps, so that a wall between two rooms belongs to both. Outside of every room box, a passage or doorframe belongs to the rooms of the openings it overlaps.
 * Empty for anything outside the gallery’s rooms and openings, which never gets culled.
 */
export function roomsOverlapping(box: Box3) {
  const result = new Set<RoomId>
  for (const {id, box: roomBox} of roomBoxes) {
    if (roomBox.intersectsBox(box)) {
      result.add(id)
    }
  }
  if (result.size) {
    return [...result]
  }
  return [...new Set(portals.filter(portal => portal.box.intersectsBox(box)).flatMap(portal => portal.rooms))]
}

const fullScreen: ScreenRect = [-1, -1, 1, 1]
/** clip-space w below which a corner counts as behind the camera */
const nearW = 1e-5

/** The part of the screen the box covers, or undefined when it is off screen. A box reaching behind the camera covers the whole screen. */
export function screenRect(box: Box3, viewProjection: Matrix4): ScreenRect | undefined {
  const e = viewProjection.elements
  let left = Number.POSITIVE_INFINITY
  let bottom = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let top = Number.NEGATIVE_INFINITY
  let behind = 0
  for (let index = 0; index < 8; index++) {
    const x = index & 1 ? box.max.x : box.min.x
    const y = index & 2 ? box.max.y : box.min.y
    const z = index & 4 ? box.max.z : box.min.z
    const w = e[3] * x + e[7] * y + e[11] * z + e[15]
    if (w < nearW) {
      behind++
      continue
    }
    const screenX = (e[0] * x + e[4] * y + e[8] * z + e[12]) / w
    const screenY = (e[1] * x + e[5] * y + e[9] * z + e[13]) / w
    left = Math.min(left, screenX)
    bottom = Math.min(bottom, screenY)
    right = Math.max(right, screenX)
    top = Math.max(top, screenY)
  }
  if (behind === 8) {
    return
  }
  if (behind) {
    return fullScreen
  }
  return intersectScreenRects(fullScreen, [left, bottom, right, top])
}

/** the overlap of two screen rectangles, or undefined when they don’t overlap */
export function intersectScreenRects(a: ScreenRect, b: ScreenRect): ScreenRect | undefined {
  const left = Math.max(a[0], b[0])
  const bottom = Math.max(a[1], b[1])
  const right = Math.min(a[2], b[2])
  const top = Math.min(a[3], b[3])
  if (left > right || bottom > top) {
    return
  }
  return [left, bottom, right, top]
}

/**
 * What the camera sees of each room: the rooms it stands in fill the screen, and the rooms behind their openings show through the part of the screen those openings cover, up to two openings deep like {@link visibleRooms}.
 * An opening seen through another only shows where both overlap, so rooms beyond a narrow gap or around a corner drop out. Rooms missing from the map are out of sight.
 */
export function visibleRegions(from: ReadonlyArray<RoomId>, viewProjection: Matrix4) {
  const regions = new Map<RoomId, Array<ScreenRect>>(from.map(room => [room, [fullScreen]]))
  const portalRects = new Map<Portal, ScreenRect | undefined>
  const through = (room: RoomId, rect: ScreenRect, depth: number) => {
    for (const portal of portals) {
      const index = portal.rooms.indexOf(room)
      const next = portal.rooms[1 - index]
      if (index === -1 || from.includes(next)) {
        continue
      }
      if (!portalRects.has(portal)) {
        portalRects.set(portal, screenRect(portal.box, viewProjection))
      }
      const portalRect = portalRects.get(portal)
      const seen = portalRect && intersectScreenRects(rect, portalRect)
      if (!seen) {
        continue
      }
      const rects = regions.get(next)
      if (rects) {
        rects.push(seen)
      } else {
        regions.set(next, [seen])
      }
      if (depth > 1) {
        through(next, seen, depth - 1)
      }
    }
  }
  for (const room of from) {
    through(room, fullScreen, 2)
  }
  return regions
}
