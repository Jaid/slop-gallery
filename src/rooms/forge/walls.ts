import type {RoomWall} from '../base/Room.ts'

import {climbArch} from '#src/lib/gallery/climb.ts'
import forge, {forgeVestibule} from '#src/lib/gallery/forge.ts'
import {boreOpening, forgeDrop} from '#src/lib/gallery/forgeGutter.ts'
import {forgeRoundVestibule} from '#src/lib/gallery/forgeVestibule.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
import {lightSwitchReservation} from '#src/lib/gallery/lightSwitch.ts'
import {forgeWindow, lobbyWindowHole} from '#src/lib/gallery/lobbyWindows.ts'
import {roundVestibuleWall} from '#src/lib/gallery/roundVestibule.ts'
import {wallCoordinates} from '#src/lib/placement/wallGeometry.ts'

import {planWall} from '../lib/walls.ts'

const height = 5.5
const [originX, , originZ] = roomOrigins.forge
const north = planWall(forge.size, 'north', height)
const {center: [vestibuleX, vestibuleZ], radius} = forgeVestibule
const vestibule = roundVestibuleWall(forgeRoundVestibule, roomOrigins.forge, height)
const west = planWall(forge.size, 'west', height)
const east = planWall(forge.size, 'east', height)
/** where the button that releases an orb into the gutter sits on the west wall, right under the hole in the ceiling the orb drops through, at the height of the Banquet’s switches */
export const releaseSpot = {
  u: wallCoordinates(west, [forgeDrop.point[0] - originX, 0, forgeDrop.point[1] - originZ]),
  y: 1.4,
}

export default {
  // The arch into the vestibule, where its round wall touches the middle of this one, as wide and as high as the approach’s vault, and over it the bare opening orbs roll through from the room’s gutter into the vestibule’s.
  north: {
    ...north,
    holes: {
      vestibule: {
        ...climbArch,
        u: wallCoordinates(north, [vestibuleX - originX, 0, vestibuleZ + radius - originZ]),
      },
      gutter: boreOpening(north, roomOrigins.forge),
    },
  },
  // The cast-glass window into the Lobby, the Salon’s mirrored, whose glass stands in the shared plane.
  east: {
    ...east,
    holes: {
      lobby_window: lobbyWindowHole(forgeWindow, east, roomOrigins.forge),
    },
  },
  south: planWall(forge.size, 'south', height),
  west: {
    ...west,
    reservations: [lightSwitchReservation(releaseSpot.u, releaseSpot.y)],
  },
  // The vestibule’s round wall, one ring facing its center, with the arch back into the room, the one out onto the Bastion’s approach and, over the arch into the room, the opening orbs roll in by.
  vestibule: {
    ...vestibule,
    holes: {
      ...vestibule.holes,
      gutter: boreOpening(vestibule, roomOrigins.forge),
    },
  },
} satisfies Record<string, RoomWall>
