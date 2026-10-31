import type {RoomWall} from '../base/Room.ts'

import {bastionApproach, bastionArch} from '#src/lib/gallery/bastion.ts'
import cinnabar from '#src/lib/gallery/cinnabar.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
import {wallCoordinates} from '#src/lib/placement/wallGeometry.ts'

import {planWall} from '../lib/walls.ts'

const height = 5.5
const [originX, , originZ] = roomOrigins.cinnabar
const north = planWall(cinnabar.size, 'north', height)
/** where the Bastion’s approach ends, in the middle of the north wall */
const [doorwayX, doorwayZ] = bastionApproach.path.at(-1)!

export default {
  // The arch out of the Bastion’s approach, as wide and as high as its vault.
  north: {
    ...north,
    holes: {
      bastion: {
        ...bastionArch,
        u: wallCoordinates(north, [doorwayX - originX, 0, doorwayZ - originZ]),
      },
    },
  },
  east: planWall(cinnabar.size, 'east', height),
  south: planWall(cinnabar.size, 'south', height),
  west: planWall(cinnabar.size, 'west', height),
} satisfies Record<string, RoomWall>
