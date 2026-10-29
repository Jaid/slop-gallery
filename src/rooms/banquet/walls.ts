import type {RoomWall} from '../base/Room.ts'

import {banquet} from '#src/lib/gallery/banquet.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
import lobby from '#src/lib/gallery/lobby.ts'
import salon from '#src/lib/gallery/salon.ts'
import {wallCoordinates} from '#src/lib/placement/wallGeometry.ts'

import {planWall} from '../lib/walls.ts'

const {size} = banquet
const height = banquet.height - 0.3
const [originX, , originZ] = roomOrigins.banquet
const west = planWall(size, 'west', height)

export default {
  north: planWall(size, 'north', height, {
    holes: {
      salon: salon.doorway,
    },
  }),
  east: planWall(size, 'east', height),
  south: planWall(size, 'south', height),
  // The arch through to the Lobby, cut where the Lobby’s east wall has it.
  west: {
    ...west,
    holes: {
      lobby: {
        u: wallCoordinates(west, [lobby.width / 2 - originX, 0, 3 - originZ]),
        width: 2.8,
        height: 3.8,
        profile: 'arch',
      },
    },
  },
} satisfies Record<string, RoomWall>
