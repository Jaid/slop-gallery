import type {RoomWall} from '../base/Room.ts'

import roomOrigins from '#src/lib/gallery/layout.ts'
import salon from '#src/lib/gallery/salon.ts'
import {salonWindowHole} from '#src/lib/gallery/salonWindow.ts'

import {planWall} from '../lib/walls.ts'

const height = 5.5
const west = planWall(salon.size, 'west', height)

export default {
  north: planWall(salon.size, 'north', height),
  east: planWall(salon.size, 'east', height),
  south: planWall(salon.size, 'south', height, {
    holes: {
      banquet: salon.doorway,
    },
  }),
  // The cast-glass window into the Lobby, whose glass stands in the shared plane.
  west: {
    ...west,
    holes: {
      lobby_window: salonWindowHole(west, roomOrigins.salon),
    },
  },
} satisfies Record<string, RoomWall>
