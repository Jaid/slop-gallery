import type {Vec3} from 'math'

import Antechamber from './antechamber/Antechamber.ts'
import Corridor from './corridor/Corridor.ts'
import Banquet from './banquet/Banquet.ts'
import Lobby from './lobby/Lobby.ts'
import Lodge from './lodge/Lodge.ts'
import Moonfall from './moonfall/Moonfall.ts'
import Oculus from './oculus/Oculus.ts'
import Salon from './salon/Salon.ts'
import Sienna from './sienna/Sienna.ts'
import Vesper from './vesper/Vesper.ts'

export type {AmbienceEmitterClass, FloorRectangle, FloorSize, Lamp, PointLamp, RoomAmbience, RoomCamera, RoomOptions, RoomPortraitSlot, RoomSpawn, SpotLamp} from './base/Room.ts'
export {default as Room} from './base/Room.ts'
export {default as floorBox} from './lib/floorBox.ts'
export {default as floorOrigin} from './lib/floorOrigin.ts'

/** every room of the gallery */
export const rooms = [new Lobby, new Vesper, new Banquet, new Antechamber, new Sienna, new Moonfall, new Oculus, new Lodge, new Corridor, new Salon] as const
export type GalleryRoom = (typeof rooms)[number]
export type RoomId = GalleryRoom['id']

/** the room the player starts in, at its default spawn */
export const defaultRoom: RoomId = 'lobby'

const byId = new Map<RoomId, GalleryRoom>(rooms.map(room => [room.id, room]))

/** The room with the id. */
export function getRoom<Id extends RoomId>(id: Id) {
  return byId.get(id) as Extract<GalleryRoom, {id: Id}>
}

/** every camera bookmark of the gallery in world meters, room by room */
export function cameraBookmarks() {
  return rooms.flatMap(room => room.worldCameras())
}

/** The player’s pose on arrival: the default spawn of the {@link defaultRoom}. */
export function defaultSpawn() {
  return getRoom(defaultRoom).worldSpawn
}

/** every portrait slot of the gallery in world meters, room by room */
export function portraitSlots() {
  return rooms.flatMap(room => room.worldSlots())
}

/** every spawn bookmark of the gallery in world meters, room by room */
export function spawnBookmarks() {
  return rooms.flatMap(room => room.worldSpawns())
}

/** The first room whose air holds the position, or undefined in passages, stairways and outdoors. */
export function roomAt(position: Vec3) {
  return rooms.find(room => room.contains(position))
}
