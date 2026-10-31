import type {RoomWall} from '../base/Room.ts'

import {wallOpeningTrim} from '#src/lib/gallery/architectureDimensions.ts'
import {banquet, banquetBoiserie} from '#src/lib/gallery/banquet.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
import lightSwitch, {lightSwitchReservation} from '#src/lib/gallery/lightSwitch.ts'
import lobby from '#src/lib/gallery/lobby.ts'
import salon from '#src/lib/gallery/salon.ts'
import {wallCoordinates} from '#src/lib/placement/wallGeometry.ts'

import {planWall} from '../lib/walls.ts'

const {size} = banquet
const height = banquet.height - 0.3
const [originX, , originZ] = roomOrigins.banquet
const west = planWall(size, 'west', height)
const lobbyArch = {
  u: wallCoordinates(west, [lobby.width / 2 - originX, 0, lobby.sideDoorZ - originZ]),
  width: lobby.sideDoorWidth,
  height: 3.8,
  profile: 'arch',
} as const
// the middle of the plain plaster between the arch’s trim and the first panel
const switchesU = lobbyArch.u + lobbyArch.width / 2 + wallOpeningTrim + banquetBoiserie.openingMargin / 2
const switchPitch = lightSwitch.plate[0] + lightSwitch.gap
const switchY = 1.4

/** The switches of the LED panes on the west wall, beside the Lobby arch: side by side, centered on the plain plaster between the arch’s trim and the first panel, at the height of a hand, the one turning them on and off nearer the arch. */
export const lightSwitchSpots = {
  power: {
    u: switchesU - switchPitch / 2,
    y: switchY,
  },
  temperature: {
    u: switchesU + switchPitch / 2,
    y: switchY,
  },
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
    reservations: [lightSwitchReservation(lightSwitchSpots.power.u, lightSwitchSpots.power.y), lightSwitchReservation(lightSwitchSpots.temperature.u, lightSwitchSpots.temperature.y)],
  },
} satisfies Record<string, RoomWall>
