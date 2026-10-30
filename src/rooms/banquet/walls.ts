import type {RoomWall} from '../base/Room.ts'

import {wallOpeningTrim} from '#src/lib/gallery/architectureDimensions.ts'
import {banquet, banquetBoiserie} from '#src/lib/gallery/banquet.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
import {lightSwitchReservation} from '#src/lib/gallery/lightSwitch.ts'
import lobby from '#src/lib/gallery/lobby.ts'
import salon from '#src/lib/gallery/salon.ts'
import {wallCoordinates} from '#src/lib/placement/wallGeometry.ts'

import {planWall} from '../lib/walls.ts'

const {size} = banquet
const height = banquet.height - 0.3
const [originX, , originZ] = roomOrigins.banquet
const west = planWall(size, 'west', height)
const lobbyArch = {
  u: wallCoordinates(west, [lobby.width / 2 - originX, 0, 3 - originZ]),
  width: 2.8,
  height: 3.8,
  profile: 'arch',
} as const

/** The switch of the LED panes on the west wall, beside the Lobby arch: centered on the plain plaster between the arch’s trim and the first panel, at the height of a hand. */
export const lightSwitchSpot = {
  u: lobbyArch.u + lobbyArch.width / 2 + wallOpeningTrim + banquetBoiserie.openingMargin / 2,
  y: 1.4,
}

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
      lobby: lobbyArch,
    },
    reservations: [lightSwitchReservation(lightSwitchSpot.u, lightSwitchSpot.y)],
  },
} satisfies Record<string, RoomWall>
