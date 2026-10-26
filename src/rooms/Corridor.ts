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
const [originX, originZ] = corridor.center
const lantern = {
  tint: '#ffb363',
} as const

export default class Corridor extends Room<'corridor'> {
  constructor() {
    super({
      id: 'corridor',
      number: 9,
      title: 'Corridor',
      description: 'Timber, turns and the long way back to Sienna.',
      origin: [corridor.center[0], corridor.floorY, corridor.center[1]],
      fence: [
        floorBox([corridorHallEastX - hallWestX, hallSouthZ - hallNorthZ], 0, corridor.height, [(hallWestX + corridorHallEastX) / 2 - originX, (hallNorthZ + hallSouthZ) / 2 - originZ]),
        // The stair flight climbs from the hall’s south end to the Sienna’s doorway.
        floorBox([stairEastX - stairWestX, corridorStairs.width], corridorStairs.end[1] - corridor.floorY, corridorStairs.start[1] + stairHeadroom - corridorStairs.end[1], [(stairWestX + stairEastX) / 2 - originX, lodge.siennaZ - originZ]),
      ],
      spawn: {
        position: [0, eyeHeight, 0],
        rotation: [0, 0, 0, 1],
      },
      // Three lanterns at both ends and in the middle; the middle one reaches farthest.
      lamps: {
        'lantern-north': {
          ...lantern,
          position: [2.08, 2.5, -24],
          strength: 14,
          range: 8,
        },
        'lantern-middle': {
          ...lantern,
          position: [0, 2.4, 0],
          strength: 5.6,
          range: 20,
          decay: 1,
        },
        'lantern-south': {
          ...lantern,
          position: [2.08, 2.4, 24],
          strength: 22.4,
          range: 6,
        },
      },
      volumetricSun: 0,
    })
  }

  /** The hall turns and climbs, so its walkable air is narrower than the fence. */
  override contains(position: Vec3) {
    return insideCorridor(position)
  }
}
