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
export type RoomOptions<Id extends string> = {
  /** a sentence shown below the title */
  description: string
  /** the room’s air as one axis-aligned box or several in world meters, from its floor (or the bottom of a sunken one) to its clear height */
  fence: Arrayable<Box3>
  id: Id
  /** the room’s place in the tour, as the map numbers it */
  number: number
  spawn: RoomSpawn
  title: string
  /** how strongly the air holds sun shafts while the player is inside, 1 at full strength; 0 turns volumetric sunlight off */
  volumetricSun?: number
}
type Arrayable<T> = ReadonlyArray<T> | T

/** how far the camera stands above the floor */
export const eyeHeight = 1.7
const point = new Vector3

/** The box over a floor rectangle, from `floorY` up by `height`. */
export function floorBox({center: [x, z], size: [width, depth]}: FloorRectangle, floorY: number, height: number) {
  return new Box3(new Vector3(x - width / 2, floorY, z - depth / 2), new Vector3(x + width / 2, floorY + height, z + depth / 2))
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
  readonly number: number
  readonly spawn: RoomSpawn
  readonly title: string
  readonly volumetricSun: number

  constructor({id, number, title, description, fence, spawn, volumetricSun = 1}: RoomOptions<Id>) {
    this.id = id
    this.number = number
    this.title = title
    this.description = description
    this.fence = fence instanceof Box3 ? [fence] : fence
    this.spawn = spawn
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
}
