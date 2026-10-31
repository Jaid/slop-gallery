import type {RoomWall} from '../base/Room.ts'

import {bastionArch} from '#src/lib/gallery/bastion.ts'
import cinnabar, {cinnabarVestibule} from '#src/lib/gallery/cinnabar.ts'
import {cinnabarRoundVestibule} from '#src/lib/gallery/cinnabarVestibule.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
import {roundVestibuleWall} from '#src/lib/gallery/roundVestibule.ts'
import {wallCoordinates} from '#src/lib/placement/wallGeometry.ts'

import {planWall} from '../lib/walls.ts'

const height = 5.5
const [originX, , originZ] = roomOrigins.cinnabar
const north = planWall(cinnabar.size, 'north', height)
const {center: [vestibuleX, vestibuleZ], radius} = cinnabarVestibule

export default {
  // The arch into the vestibule, where its round wall touches the middle of this one, as wide and as high as the approach’s vault.
  north: {
    ...north,
    holes: {
      vestibule: {
        ...bastionArch,
        u: wallCoordinates(north, [vestibuleX - originX, 0, vestibuleZ + radius - originZ]),
      },
    },
  },
  east: planWall(cinnabar.size, 'east', height),
  south: planWall(cinnabar.size, 'south', height),
  west: planWall(cinnabar.size, 'west', height),
  // The vestibule’s round wall, one ring facing its center, with the arch back into the room and the one out onto the Fortress’ approach.
  vestibule: roundVestibuleWall(cinnabarRoundVestibule, roomOrigins.cinnabar, height),
} satisfies Record<string, RoomWall>
