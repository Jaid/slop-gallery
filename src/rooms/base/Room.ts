import type AmbienceEmitter from '#src/lib/audio/ambience/base/AmbienceEmitter.ts'
import type {CameraBookmark, PortraitRatio, PortraitSlot, SpawnBookmark} from '#src/lib/gallery/types.ts'
import type {Quat, Vec3} from 'math'

import {Box3, Vector3} from 'three/webgpu'

import {slotFrame} from '#src/lib/placement/portraitSlots.ts'

/** an ambience emitter class whose instances can sound from any world position */
export type AmbienceEmitterClass = new (position?: Vec3) => AmbienceEmitter
/** a looping ambient sound of a room */
export type RoomAmbience = {
  emitter: AmbienceEmitterClass
  /** where the sound comes from, relative to the room’s {@link Room.origin} */
  position: Vec3
}
/** a named camera view in the room, positioned relative to the room’s {@link Room.origin} */
export type RoomCamera = Omit<CameraBookmark, 'id'>
/** a named player pose in the room to teleport to, positioned relative to the room’s {@link Room.origin} */
export type RoomSpawnBookmark = Omit<SpawnBookmark, 'id'>
/** a rectangle on the floor plan, centered on its x and z */
export type FloorRectangle = {
  center: readonly [x: number, z: number]
  size: FloorSize
}
/** the extent of a rectangle on the floor plan along x and z */
export type FloorSize = readonly [width: number, depth: number]
/** where visitors arrive in a room: the camera’s position relative to the room’s {@link Room.origin} and its orientation */
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
/** a spot on a wall of the room reserved for one default work of matching ratio */
export type RoomPortraitSlot = {
  /** frame area in cm², which sets the frame’s size together with its ratio */
  area: number
  /** whether the slot hangs low and its work’s placard goes above the frame */
  labelAbove?: boolean
  /** center of the frame, hanging in front of its wall, relative to the room’s {@link Room.origin} */
  position: Vec3
  /** Default works fill free slots of higher priority first, and slots of equal priority in random order; 0 by default. */
  priority?: number
  ratio: PortraitRatio
  /** turn around y in radians, the same as its wall’s */
  rotation: number
  /** the wall’s id within the room, in snake_case */
  wallId: string
}
/** a light fixed in a room */
export type Lamp = PointLamp | SpotLamp
export type RoomOptions = {
  /** the room’s ambient sounds by their id within the room, in snake_case */
  ambience?: Record<string, RoomAmbience>
  /** the camera bookmarks by their id within the room, in snake_case */
  cameras?: Record<string, RoomCamera>
  /** the lamps by their id within the room, in snake_case, positioned relative to the room’s {@link Room.origin} */
  lamps?: Record<string, Lamp>
  /** the portrait slots by their id within the room, in snake_case, which stays stable so edited slots find their originals */
  slots?: Record<string, RoomPortraitSlot>
  /** the spawn bookmarks by their id within the room, in snake_case */
  spawns?: Record<string, RoomSpawnBookmark>
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

const point = new Vector3

/**
 * A room of a level: what it is called, the air it fences off, where visitors arrive and how the sun behaves inside.
 * Subclasses declare their identity and geometry as class fields, pass the rest to the constructor and can refine {@link contains} where a few boxes don’t describe the air well enough.
 * Field initializers of subclasses run after this constructor, so everything derived from them is a getter.
 */
export default abstract class Room {
  readonly ambience: ReadonlyMap<string, RoomAmbience>
  readonly cameras: ReadonlyMap<string, RoomCamera>
  /** a sentence shown below the title */
  abstract readonly description: string
  /** the room’s air as one axis-aligned box or several relative to {@link origin}, from its floor (or the bottom of a sunken one) to its clear height */
  abstract readonly fence: Arrayable<Box3>
  /** in snake_case, also the prefix of the global ids of everything in the room */
  abstract readonly id: string
  readonly lamps: ReadonlyMap<string, Lamp>
  /** the point in world meters every other position of the room is relative to, usually the middle of its floor */
  abstract readonly origin: Vec3
  readonly slots: ReadonlyMap<string, RoomPortraitSlot>
  abstract readonly spawn: RoomSpawn
  readonly spawns: ReadonlyMap<string, RoomSpawnBookmark>
  readonly title: string
  readonly volumetricSun: number

  constructor({title, lamps = {}, ambience = {}, cameras = {}, slots = {}, spawns = {}, volumetricSun = 1}: RoomOptions) {
    this.title = title
    this.lamps = new Map(Object.entries(lamps))
    this.ambience = new Map(Object.entries(ambience))
    this.slots = new Map(Object.entries(slots))
    this.cameras = new Map(Object.entries(cameras))
    this.spawns = new Map(Object.entries(spawns))
    this.volumetricSun = volumetricSun
  }

  /** the box around the whole fence, relative to {@link origin} */
  get bounds() {
    return this.fences.reduce((result, box) => result.union(box), new Box3)
  }

  /** the boxes of the {@link fence}, always as a list */
  get fences(): ReadonlyArray<Box3> {
    return this.fence instanceof Box3 ? [this.fence] : this.fence
  }

  /** whether sun shafts render while the player is inside */
  get hasVolumetricSun() {
    return this.volumetricSun > 0
  }

  /** the fence’s boxes in world meters */
  get worldFence() {
    const offset = new Vector3(...this.origin)
    return this.fences.map(box => box.clone().translate(offset))
  }

  /** the spawn in world meters */
  get worldSpawn(): RoomSpawn {
    return {
      ...this.spawn,
      position: this.toWorld(this.spawn.position),
    }
  }

  /** Whether the world position lies in the room’s air. */
  contains(position: Vec3) {
    point.set(...this.toLocal(position))
    return this.fences.some(box => box.containsPoint(point))
  }

  /** New, still silent emitters of the room’s ambient sounds, each at its world position. */
  createAmbience() {
    return this.ambience.values().map(({emitter: Emitter, position}) => new Emitter(this.toWorld(position))).toArray()
  }

  /** The gallery-wide id of a lamp, ambient sound, wall or slot of the room: the room’s id and the id within the room, joined by a hyphen. */
  globalId(id: string) {
    return `${this.id}-${id}`
  }

  /** The position relative to the room’s {@link origin} of a point given in world meters. */
  toLocal([x, y, z]: Vec3): Vec3 {
    return [x - this.origin[0], y - this.origin[1], z - this.origin[2]]
  }

  /** The world position of a point given relative to the room’s {@link origin}. */
  toWorld([x, y, z]: Vec3): Vec3 {
    return [this.origin[0] + x, this.origin[1] + y, this.origin[2] + z]
  }

  /** The camera bookmarks with global ids in world meters. */
  worldCameras(): Array<CameraBookmark> {
    return this.cameras.entries().map(([id, camera]) => ({
      ...camera,
      id: this.globalId(id),
      position: this.toWorld(camera.position),
    })).toArray()
  }

  /** Every lamp with its global id and its position, and a spot’s target, in world meters. */
  *worldLamps() {
    for (const [id, lamp] of this.lamps) {
      yield {
        ...lamp,
        id: this.globalId(id),
        position: this.toWorld(lamp.position),
        ...lamp.kind === 'spot' ? {target: this.toWorld(lamp.target)} : {},
      } as Lamp & {id: string}
    }
  }

  /** The portrait slots with global ids in world meters, as the placement code takes them. */
  worldSlots(): Array<PortraitSlot> {
    return this.slots.entries().map(([id, {area, position, priority = 0, labelAbove, wallId, ...slot}]) => ({
      id: this.globalId(id),
      ...slot,
      wallId: this.globalId(wallId),
      priority,
      ...slotFrame(slot.ratio, area),
      position: this.toWorld(position),
      ...labelAbove ? {labelAbove} : {},
    })).toArray()
  }

  /** The spawn bookmarks with global ids in world meters. */
  worldSpawns(): Array<SpawnBookmark> {
    return this.spawns.entries().map(([id, spawn]) => ({
      ...spawn,
      id: this.globalId(id),
      position: this.toWorld(spawn.position),
    })).toArray()
  }
}
