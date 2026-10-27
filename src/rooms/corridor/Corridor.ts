import type {RoomSpawn} from '../base/Room.ts'
import type {Vec3} from 'math'

import corridor, {corridorHallEastX, corridorStairs, insideCorridor} from '#src/lib/gallery/corridor.ts'
import lodge from '#src/lib/gallery/lodge.ts'
import {stairHeadroom} from '#src/lib/gallery/stairs/StairFlight.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import lamps from './lamps.ts'

const hallWestX = lodge.approachX - lodge.timberWidth / 2
const hallNorthZ = lodge.returnZ - lodge.timberWidth / 2
const hallSouthZ = lodge.siennaZ + lodge.timberWidth / 2
const stairXs = corridorStairs.blocks.flatMap(block => [block.position[0] - block.size[0] / 2, block.position[0] + block.size[0] / 2])
const stairWestX = Math.min(...stairXs)
const stairEastX = Math.max(...stairXs)
const [originX, originZ] = corridor.center

export default class Corridor extends Room {
  override readonly color = '#8c6747'
  override readonly description = 'Timber, turns and the long way back to Sienna.'
  override readonly fence = [
    floorBox([corridorHallEastX - hallWestX, hallSouthZ - hallNorthZ], 0, corridor.height, [(hallWestX + corridorHallEastX) / 2 - originX, (hallNorthZ + hallSouthZ) / 2 - originZ]),
    // The stair flight climbs from the hall’s south end to the Sienna’s doorway.
    floorBox([stairEastX - stairWestX, corridorStairs.width], corridorStairs.end[1] - corridor.floorY, corridorStairs.start[1] + stairHeadroom - corridorStairs.end[1], [(stairWestX + stairEastX) / 2 - originX, lodge.siennaZ - originZ]),
  ]
  override readonly floorY = corridor.floorY
  override readonly id = 'corridor'
  override readonly origin: Vec3 = [originX, this.floorY, originZ]
  override readonly spawn = {
    position: [0, 0.04, 0],
    yaw: 0,
    pitch: 0,
  } satisfies RoomSpawn

  constructor() {
    super({
      title: 'Corridor',
      lamps,
      volumetricSun: 0,
    })
  }

  /** The hall turns and climbs, so its walkable air is narrower than the fence. */
  override contains(position: Vec3) {
    return insideCorridor(position)
  }
}
