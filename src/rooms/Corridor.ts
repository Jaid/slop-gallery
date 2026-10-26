import type {Vec3} from 'math'

import corridor, {corridorHallEastX, corridorStairs, insideCorridor} from '#src/lib/gallery/corridor.ts'
import lodge from '#src/lib/gallery/lodge.ts'
import {stairHeadroom} from '#src/lib/gallery/stairs/StairFlight.ts'

import Room, {eyeHeight, floorBox} from './base/Room.ts'

const hallWestX = lodge.approachX - lodge.timberWidth / 2
const hallNorthZ = lodge.returnZ - lodge.timberWidth / 2
const hallSouthZ = lodge.siennaZ + lodge.timberWidth / 2
const stairXs = corridorStairs.blocks.flatMap(block => [block.position[0] - block.size[0] / 2, block.position[0] + block.size[0] / 2])
const stairWestX = Math.min(...stairXs)
const stairEastX = Math.max(...stairXs)

export default class Corridor extends Room<'corridor'> {
  constructor() {
    super({
      id: 'corridor',
      number: 9,
      title: 'Corridor',
      description: 'Timber, turns and the long way back to Sienna.',
      fence: [
        floorBox({
          center: [(hallWestX + corridorHallEastX) / 2, (hallNorthZ + hallSouthZ) / 2],
          size: [corridorHallEastX - hallWestX, hallSouthZ - hallNorthZ],
        }, corridor.floorY, corridor.height),
        // The stair flight climbs from the hall’s south end to the Sienna’s doorway.
        floorBox({
          center: [(stairWestX + stairEastX) / 2, lodge.siennaZ],
          size: [stairEastX - stairWestX, corridorStairs.width],
        }, corridorStairs.end[1], corridorStairs.start[1] + stairHeadroom - corridorStairs.end[1]),
      ],
      spawn: {
        position: [corridor.center[0], corridor.floorY + eyeHeight, corridor.center[1]],
        rotation: [0, 0, 0, 1],
      },
      volumetricSun: 0,
    })
  }

  /** The hall turns and climbs, so its walkable air is narrower than the fence. */
  override contains(position: Vec3) {
    return insideCorridor(position)
  }
}
