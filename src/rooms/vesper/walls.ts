import type {FloorSize, RoomWall} from '../base/Room.ts'

import lobby from '#src/lib/gallery/lobby.ts'

import {planWall} from '../lib/walls.ts'

const size: FloorSize = [12, 16]
const height = 5.5
const doorway = (u: number) => ({
  u,
  width: 2.8,
  height: 3.8,
  profile: 'arch',
}) as const

export default {
  north: planWall(size, 'north', height),
  west: planWall(size, 'west', height),
  south: planWall(size, 'south', height, {
    holes: {
      sienna: doorway(-3.8),
    },
  }),
  east: planWall(size, 'east', height, {
    holes: {
      lobby: doorway(lobby.sideDoorZ),
    },
  }),
} satisfies Record<string, RoomWall>
