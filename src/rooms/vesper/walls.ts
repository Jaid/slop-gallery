import type {RoomWall} from '../base/Room.ts'

import cinnabar from '#src/lib/gallery/cinnabar.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
import lobby from '#src/lib/gallery/lobby.ts'
import {vesper} from '#src/lib/gallery/vesper.ts'
import {wallCoordinates} from '#src/lib/placement/wallGeometry.ts'

import {planWall} from '../lib/walls.ts'

const {size} = vesper
const height = vesper.height - 0.3
const [originX, , originZ] = roomOrigins.vesper
const doorway = (u: number) => ({
  u,
  width: 2.8,
  height: 3.8,
  profile: 'arch',
}) as const
const east = planWall(size, 'east', height)

export default {
  north: planWall(size, 'north', height, {
    holes: {
      cinnabar: cinnabar.doorway,
    },
  }),
  west: planWall(size, 'west', height),
  south: planWall(size, 'south', height, {
    holes: {
      sienna: doorway(-3.8),
    },
  }),
  // The arch through to the Lobby, cut where the Lobby’s west wall has it.
  east: {
    ...east,
    holes: {
      lobby: doorway(wallCoordinates(east, [-lobby.width / 2 - originX, 0, lobby.sideDoorZ - originZ])),
    },
  },
} satisfies Record<string, RoomWall>
