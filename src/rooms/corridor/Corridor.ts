import type {GroundSurface, RoomSpawn} from '../base/Room.ts'

import {Geofence} from 'geofency'

import corridor, {corridorHallEastX, corridorStairs} from '#src/lib/gallery/corridor.ts'
import lodge from '#src/lib/gallery/lodge.ts'
import {stairHeadroom} from '#src/lib/gallery/stairs/StairFlight.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import lamps from './lamps.ts'
import walls from './walls.ts'

const hallWestX = lodge.approachX - lodge.timberWidth / 2
const hallNorthZ = lodge.returnZ - lodge.timberWidth / 2
const hallSouthZ = lodge.siennaZ + lodge.timberWidth / 2
const stairXs = corridorStairs.blocks.flatMap(block => [block.position[0] - block.size[0] / 2, block.position[0] + block.size[0] / 2])
const stairWestX = Math.min(...stairXs)
const stairEastX = Math.max(...stairXs)
const [originX, originZ] = corridor.center

/** Laid out around the middle of its long hall, at the height of its floor. */
export default class Corridor extends Room {
  override readonly air = [
    floorBox([corridorHallEastX - hallWestX, hallSouthZ - hallNorthZ], 0, corridor.height, [(hallWestX + corridorHallEastX) / 2 - originX, (hallNorthZ + hallSouthZ) / 2 - originZ]),
    // The stair flight climbs from the hall’s south end to the Sienna’s doorway.
    floorBox([stairEastX - stairWestX, corridorStairs.width], corridorStairs.end[1] - corridor.floorY, corridorStairs.start[1] + stairHeadroom - corridorStairs.end[1], [(stairWestX + stairEastX) / 2 - originX, lodge.siennaZ - originZ]),
  ]
  override readonly color = '#8c6747'
  override readonly description = 'Timber, turns and the long way back to Sienna.'
  override readonly fence = new Geofence([
    // The long hall, at every height, as nothing lies above or below it.
    footprint([this.air[0]]),
    // The stair flight up to the Sienna, from the hall’s floor up; it comes after Moonfall, whose air lies right under the flight’s low end, and after the Sienna, whose wall the flight starts in.
    {
      ...footprint([this.air[1]]),
      floor: 0,
    },
  ])
  override readonly height = corridor.height
  override readonly id = 'corridor'
  override readonly size = corridor.size
  override readonly spawn = {
    position: [0, 0.04, 0],
    yaw: 0,
    pitch: 0,
  } satisfies RoomSpawn

  constructor() {
    super({
      title: 'Corridor',
      lamps,
      skybox: null,
      sunlit: false,
      volumetricSun: 0,
      walls,
    })
  }

  /** The boards sound hollow. */
  override groundSurface(): GroundSurface {
    return 'hollow'
  }
}
