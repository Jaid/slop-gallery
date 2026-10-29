import type {RoomWall} from '../base/Room.ts'

import mainEntrance from '#src/lib/gallery/entrance.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
import lobby from '#src/lib/gallery/lobby.ts'
import {salonWindowHole} from '#src/lib/gallery/salonWindow.ts'

const height = 5.5
const [, , originZ] = roomOrigins.lobby
/** A wall at the museum’s `z`, `x` relative to the room’s middle. */
const wall = (x: number, z: number, rotation: number, width: number, holes?: RoomWall['holes']): RoomWall => ({
  center: [x, 0, z - originZ],
  rotation,
  width,
  height,
  ...holes ? {holes} : {},
})
const doorway = (u: number) => ({
  u,
  width: 2.8,
  height: 3.8,
  profile: 'arch',
}) as const
const extensionZ = (lobby.northZ + lobby.previousNorthZ) / 2
const extensionWidth = lobby.previousNorthZ - lobby.northZ
const extensionEast = wall(lobby.width / 2, extensionZ, -Math.PI / 2, extensionWidth)

export default {
  north: {
    ...wall(0, lobby.northZ, 0, lobby.width),
    reservations: [mainEntrance.reservation],
  },
  // The original side walls and doorways stay where they were; the extension only reaches on north.
  extension_west: wall(-lobby.width / 2, extensionZ, Math.PI / 2, extensionWidth),
  // The cast-glass window into the Salon, whose glass stands in the shared plane.
  extension_east: {
    ...extensionEast,
    holes: {
      salon_window: salonWindowHole(extensionEast, roomOrigins.lobby),
    },
  },
  west: wall(-lobby.width / 2, 0, Math.PI / 2, 16, {
    vesper: doorway(-3),
  }),
  east: wall(lobby.width / 2, 0, -Math.PI / 2, 16, {
    banquet: doorway(3),
  }),
  south: wall(0, 8, Math.PI, 16, {
    antechamber: {
      u: 0,
      width: 2.6,
      height: 3.6,
      profile: 'rectangle',
    },
  }),
} satisfies Record<string, RoomWall>
