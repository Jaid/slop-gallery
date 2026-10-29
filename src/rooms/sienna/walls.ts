import type {FloorSize, RoomWall} from '../base/Room.ts'

import lodge from '#src/lib/gallery/lodge.ts'

import {planWall} from '../lib/walls.ts'

const size: FloorSize = [12, 12]
const height = 5.5

export default {
  north: planWall(size, 'north', height, {
    holes: {
      vesper: {
        u: 3.8,
        width: 2.8,
        height: 3.8,
        profile: 'arch',
      },
    },
  }),
  // The arch onto the Corridor’s stair flight.
  west: planWall(size, 'west', height, {
    holes: {
      corridor: {
        u: 14 - lodge.siennaZ,
        width: lodge.timberWidth,
        height: 3.4,
        profile: 'arch',
      },
    },
  }),
  east: planWall(size, 'east', height),
  south: planWall(size, 'south', height),
} satisfies Record<string, RoomWall>
