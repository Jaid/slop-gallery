import type {FloorSize, RoomSpawn} from '../base/Room.ts'

import {Geofence} from 'geofency'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import {planWall} from '../lib/walls.ts'
import map from './map.svg?raw'
import slots from './slots.ts'

/** edge length of the floor’s marble tiles, the same as the Arena’s */
const tile = 0.6875
/** whole tiles from wall to wall, along both axes */
const size: FloorSize = [12 * tile, 12 * tile]
const height = 4

/** The Sandbox’s one room: an empty, sealed square in the Arena’s marble and velvet, laid out around the middle of its floor. */
export default class Cell extends Room {
  override readonly air = floorBox(size, 0, height)
  override readonly color = '#5d242b'
  override readonly description = 'Nothing in it yet.'
  // Its whole floor plan at every height, as it is all there is.
  override readonly fence = new Geofence([footprint([this.air])])
  /** edge length of the floor’s marble tiles, which run whole from wall to wall */
  readonly floorTile = tile
  override readonly height = height
  override readonly id = 'cell'
  override readonly size = size
  // In front of the south wall, looking north across the room.
  override readonly spawn: RoomSpawn = {
    position: [0, 0.04, 2.5],
    yaw: 0,
    pitch: 0,
  }

  constructor() {
    super({
      title: 'Cell',
      map,
      slots,
      // Four plain walls, which artworks may hang on.
      walls: {
        north: planWall(size, 'north', height),
        east: planWall(size, 'east', height),
        south: planWall(size, 'south', height),
        west: planWall(size, 'west', height),
      },
    })
  }
}
