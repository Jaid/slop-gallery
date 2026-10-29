import type {FloorSize, RoomWall} from '../base/Room.ts'

import staircase from '#src/lib/gallery/staircase.ts'

import {planWall} from '../lib/walls.ts'

const size: FloorSize = [8, 8]
// Taller than the other upper rooms, a meter short of a cube.
const height = 6.7

export default {
  north: planWall(size, 'north', height, {
    holes: {
      lobby: {
        u: 0,
        width: 2.6,
        height: 3.6,
        profile: 'rectangle',
      },
    },
  }),
  west: planWall(size, 'west', height),
  east: planWall(size, 'east', height, {
    holes: {
      stairway: {
        u: 0,
        width: staircase.width,
        height: 3.6,
        profile: 'rectangle',
      },
    },
  }),
  south: planWall(size, 'south', height),
} satisfies Record<string, RoomWall>
