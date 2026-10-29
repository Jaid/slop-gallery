import type {Vec3} from '#src/lib/gallery/types.ts'
import type PlacedRoom from '../base/PlacedRoom.ts'
import type {PlacedLamp} from '../base/PlacedRoom.ts'
import type {RoomPlacement} from '../base/World.ts'

import {lazy} from 'react'

import roomOrigins from '#src/lib/gallery/layout.ts'
import {GalleryPlacementSpace} from '#src/lib/placement/GalleryPlacementSpace.ts'
import Antechamber from '#src/rooms/antechamber/Antechamber.ts'
import Banquet from '#src/rooms/banquet/Banquet.ts'
import Corridor from '#src/rooms/corridor/Corridor.ts'
import Exhibition from '#src/rooms/exhibition/Exhibition.ts'
import Fortress from '#src/rooms/fortress/Fortress.ts'
import Lobby from '#src/rooms/lobby/Lobby.ts'
import Lodge from '#src/rooms/lodge/Lodge.ts'
import Moonfall from '#src/rooms/moonfall/Moonfall.ts'
import Oculus from '#src/rooms/oculus/Oculus.ts'
import Salon from '#src/rooms/salon/Salon.ts'
import Sienna from '#src/rooms/sienna/Sienna.ts'
import Vesper from '#src/rooms/vesper/Vesper.ts'

import World from '../base/World.ts'
import {worlds} from '../index.ts'
import artworks from './artworks.ts'
import GalleryNavigation from './navigation.ts'
import {litRooms} from './relations.ts'

/** a room of the gallery */
export type GalleryRoom = Antechamber | Banquet | Corridor | Exhibition | Fortress | Lobby | Lodge | Moonfall | Oculus | Salon | Sienna | Vesper
export type GalleryRoomId = GalleryRoom['id']

/**
 * Every room at the origin the gallery’s layout gives it, in the order their fences are checked: the ground floor first, then the lower rooms, each passage after the rooms its fence meets.
 */
const placements: ReadonlyArray<RoomPlacement<GalleryRoom>> = [
  new Lobby,
  new Vesper,
  new Banquet,
  new Antechamber,
  new Sienna,
  new Salon,
  new Moonfall,
  new Lodge,
  new Corridor,
  new Oculus,
  new Exhibition,
  new Fortress,
].map(room => [room, roomOrigins[room.id]])
const minimap = lazy(() => import('#component/GalleryMinimap'))
const scene = lazy(() => import('#component/GalleryScene'))

/** The museum: its upper floor of galleries around the Lobby, and the lower floor around Moonfall and the Oculus below. */
export default class SlopGallery extends World<GalleryRoom> {
  override readonly artworks = artworks
  override readonly defaultRoom = 'lobby'
  override readonly id = 'gallery'
  override readonly Minimap = minimap
  override readonly narratesIntroduction = true
  override readonly placement: GalleryPlacementSpace
  override readonly Scene = scene

  private readonly navigation: GalleryNavigation

  constructor() {
    super(worlds.gallery, placements)
    this.navigation = new GalleryNavigation(this.rooms)
    this.placement = new GalleryPlacementSpace(this.walls, this.navigation)
  }

  override contains(position: Vec3) {
    return this.navigation.contains(position)
  }

  override floorHeight(position: Vec3) {
    return this.navigation.floorHeight(position)
  }

  /** A lamp only shines while the player is in its own room or in one that keeps it on, because it reaches in or can be seen from there. */
  override lampRooms(lamp: PlacedLamp) {
    return litRooms(lamp.room as GalleryRoomId, lamp.id)
  }

  override roomTagline(room: PlacedRoom<GalleryRoom>) {
    return room.floorY < 0 ? 'lower floor room' : 'upper floor room'
  }

  /** How far a ray from the origin travels until it meets a wall, a little farther than the wall itself. */
  override wallDistance(origin: Vec3, direction: Vec3) {
    const hit = this.placement.findPlacement(origin, direction, 0, 0, [])
    return hit ? Math.hypot(...hit.position.map((value, index) => value - origin[index]) as Vec3) + 0.3 : Infinity
  }
}
