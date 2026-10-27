import type {Vec3} from 'math'

import Antechamber from './Antechamber.ts'
import Corridor from './Corridor.ts'
import Dine from './Dine.ts'
import Lobby from './Lobby.ts'
import Lodge from './Lodge.ts'
import Moonfall from './Moonfall.ts'
import Oculus from './Oculus.ts'
import Salon from './Salon.ts'
import Sienna from './Sienna.ts'
import Vesper from './Vesper.ts'

export type {AmbienceEmitterClass, FloorRectangle, FloorSize, Lamp, PointLamp, RoomAmbience, RoomOptions, RoomPortraitSlot, RoomSpawn, SpotLamp} from './base/Room.ts'
export {default as Room} from './base/Room.ts'
export {default as eyeHeight} from './lib/eyeHeight.ts'
export {default as floorBox} from './lib/floorBox.ts'
export {default as floorOrigin} from './lib/floorOrigin.ts'
export {default as southSpawn} from './lib/southSpawn.ts'

/** every room of the gallery, in the map’s order */
export const rooms = [new Lobby, new Vesper, new Dine, new Antechamber, new Sienna, new Moonfall, new Oculus, new Lodge, new Corridor, new Salon] as const
export type GalleryRoom = (typeof rooms)[number]
export type RoomId = GalleryRoom['id']

const byId = new Map<RoomId, GalleryRoom>(rooms.map(room => [room.id, room]))

/** The room with the id. */
export function getRoom<Id extends RoomId>(id: Id) {
  return byId.get(id) as Extract<GalleryRoom, {id: Id}>
}

/** every portrait slot of the gallery in world meters, room by room */
export function portraitSlots() {
  return rooms.flatMap(room => room.worldSlots())
}

/** The first room whose air holds the position, or undefined in passages, stairways and outdoors. */
export function roomAt(position: Vec3) {
  return rooms.find(room => room.contains(position))
}
