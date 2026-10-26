import type {Quat, Vec3} from 'math'

import {Box3, Vector3} from 'three/webgpu'

/** a rectangle on the floor plan, centered on its x and z */
export type FloorRectangle = {
  center: readonly [x: number, z: number]
  size: readonly [width: number, depth: number]
}
/** where visitors arrive in a room: the camera’s position in world meters and its orientation */
export type RoomSpawn = {
  position: Vec3
  rotation: Quat
}
export type PointLamp = LampBase & {
  kind?: 'point'
}
export type SpotLamp = LampBase & {
  /** half the cone’s opening in radians */
  angle: number
  kind: 'spot'
  /** share of the cone’s edge that fades out, 0–1 */
  penumbra?: number
  /** the point the spot aims at, relative to the room’s {@link Room.origin} */
  target: Vec3
}
/** a light fixed in a room */
export type Lamp = PointLamp | SpotLamp
export type RoomOptions<Id extends string> = {
  /** a sentence shown below the title */
  description: string
  /** the room’s air as one axis-aligned box or several in world meters, from its floor (or the bottom of a sunken one) to its clear height */
  fence: Arrayable<Box3>
  id: Id
  /** the lamps by id, positioned relative to {@link origin} */
  lamps?: Record<string, Lamp>
  /** the number the map shows for the room, which also orders its room list */
  number: number
  /** the point in world meters the room’s contents are positioned from, usually the middle of its floor */
  origin: Vec3
  spawn: RoomSpawn
  title: string
  /** how strongly the air holds sun shafts while the player is inside, 1 at full strength; 0 turns volumetric sunlight off */
  volumetricSun?: number
}
type LampBase = {
  /** how quickly the light fades with distance, 2 (physical) by default */
  decay?: number
  /** whether the lamp goes out when only the essential lamps are on */
  optional?: boolean
  /** relative to the room’s {@link Room.origin}, in meters */
  position: Vec3
  /** meters after which the light is cut off; 0 or left out reaches forever */
  range?: number
  /** whether the lamp casts shadows; point lights borrow a slot of the shadow pool for it */
  shadow?: boolean
  /** luminous intensity in candela, 1 by default */
  strength?: number
  /** light color as #rrggbb, white by default */
  tint?: string
}
type Arrayable<T> = ReadonlyArray<T> | T

/** how far the camera stands above the floor */
export const eyeHeight = 1.7
const point = new Vector3

/** The box over a floor rectangle, from `floorY` up by `height`. */
export function floorBox({center: [x, z], size: [width, depth]}: FloorRectangle, floorY: number, height: number) {
  return new Box3(new Vector3(x - width / 2, floorY, z - depth / 2), new Vector3(x + width / 2, floorY + height, z + depth / 2))
}

/** The middle of a floor rectangle at `floorY`, as most rooms’ {@link Room.origin}. */
export function floorOrigin({center: [x, z]}: FloorRectangle, floorY: number): Vec3 {
  return [x, floorY, z]
}

/** The spot visitors arrive at by default: at eye height, 2.4 m in from the middle of the south wall, looking north. */
export function southSpawn({center: [x, z], size: [, depth]}: FloorRectangle, floorY: number): RoomSpawn {
  return {
    position: [x, floorY + eyeHeight, z + depth / 2 - 2.4],
    rotation: [0, 0, 0, 1],
  }
}

/**
 * A room of a level: what it is called, the air it fences off, where visitors arrive and how the sun behaves inside.
 * Subclasses pass their data to the constructor and can refine {@link contains} where a few boxes don’t describe the air well enough.
 */
export default abstract class Room<Id extends string = string> {
  readonly description: string
  readonly fence: ReadonlyArray<Box3>
  readonly id: Id
  readonly lamps: ReadonlyMap<string, Lamp>
  readonly number: number
  readonly origin: Vec3
  readonly spawn: RoomSpawn
  readonly title: string
  readonly volumetricSun: number

  constructor({id, number, title, description, origin, fence, spawn, lamps = {}, volumetricSun = 1}: RoomOptions<Id>) {
    this.id = id
    this.number = number
    this.title = title
    this.description = description
    this.origin = origin
    this.fence = fence instanceof Box3 ? [fence] : fence
    this.spawn = spawn
    this.lamps = new Map(Object.entries(lamps))
    this.volumetricSun = volumetricSun
  }

  /** the box around the whole fence */
  get bounds() {
    return this.fence.reduce((result, box) => result.union(box), new Box3)
  }

  /** whether sun shafts render while the player is inside */
  get hasVolumetricSun() {
    return this.volumetricSun > 0
  }

  /** Whether the position lies in the room’s air. */
  contains([x, y, z]: Vec3) {
    point.set(x, y, z)
    return this.fence.some(box => box.containsPoint(point))
  }

  /** The world position of a point given relative to the room’s {@link origin}. */
  toWorld([x, y, z]: Vec3): Vec3 {
    return [this.origin[0] + x, this.origin[1] + y, this.origin[2] + z]
  }

  /** Every lamp with its position, and a spot’s target, in world meters. */
  *worldLamps() {
    for (const [id, lamp] of this.lamps) {
      yield {
        ...lamp,
        id,
        position: this.toWorld(lamp.position),
        ...lamp.kind === 'spot' ? {target: this.toWorld(lamp.target)} : {},
      } as Lamp & {id: string}
    }
  }
}
