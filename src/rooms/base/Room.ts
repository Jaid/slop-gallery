import type AmbienceEmitter from '#src/lib/audio/ambience/base/AmbienceEmitter.ts'
import type {Quat, Vec3} from 'math'

import {Box3, Vector3} from 'three/webgpu'

/** an ambience emitter class whose instances can sound from any world position */
export type AmbienceEmitterClass = new (position?: Vec3) => AmbienceEmitter
/** a looping ambient sound of a room */
export type RoomAmbience = {
  emitter: AmbienceEmitterClass
  /** where the sound comes from, relative to the room’s {@link Room.origin} */
  position: Vec3
}
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
/** a light fixed in a room */
export type Lamp = PointLamp | SpotLamp
export type RoomOptions = {
  /** the room’s ambient sounds by id */
  ambience?: Record<string, RoomAmbience>
  /** the lamps by id, positioned relative to the room’s {@link Room.origin} */
  lamps?: Record<string, Lamp>
  /** the number the map shows for the room, which also orders its room list */
  number: number
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
  /** a sentence shown below the title */
  abstract readonly description: string
  /** the room’s air as one axis-aligned box or several relative to {@link origin}, from its floor (or the bottom of a sunken one) to its clear height */
  abstract readonly fence: Arrayable<Box3>
  abstract readonly id: string
  readonly lamps: ReadonlyMap<string, Lamp>
  readonly number: number
  /** the point in world meters every other position of the room is relative to, usually the middle of its floor */
  abstract readonly origin: Vec3
  abstract readonly spawn: RoomSpawn
  readonly title: string
  readonly volumetricSun: number

  constructor({number, title, lamps = {}, ambience = {}, volumetricSun = 1}: RoomOptions) {
    this.number = number
    this.title = title
    this.lamps = new Map(Object.entries(lamps))
    this.ambience = new Map(Object.entries(ambience))
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

  /** The position relative to the room’s {@link origin} of a point given in world meters. */
  toLocal([x, y, z]: Vec3): Vec3 {
    return [x - this.origin[0], y - this.origin[1], z - this.origin[2]]
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
