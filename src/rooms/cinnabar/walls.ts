import type {RoomWall} from '../base/Room.ts'

import {bastionArch} from '#src/lib/gallery/bastion.ts'
import cinnabar, {cinnabarVestibule} from '#src/lib/gallery/cinnabar.ts'
import {vestibuleArches, vestibuleArchHole} from '#src/lib/gallery/cinnabarVestibule.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
import {wallCoordinates} from '#src/lib/placement/wallGeometry.ts'

import {planWall} from '../lib/walls.ts'

const height = 5.5
const [originX, , originZ] = roomOrigins.cinnabar
const north = planWall(cinnabar.size, 'north', height)
const {center: [vestibuleX, vestibuleZ], radius} = cinnabarVestibule
/** where the vestibule’s wall has its middle round its center: halfway between its arches, so that the seam where its ends meet lies across from them */
const middle = vestibuleArches.reduce((sum, {angle}) => sum + angle, 0) / vestibuleArches.length

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
  vestibule: {
    center: [vestibuleX + Math.cos(middle) * radius - originX, 0, vestibuleZ + Math.sin(middle) * radius - originZ],
    rotation: Math.atan2(-Math.cos(middle), -Math.sin(middle)),
    width: Math.PI * 2 * radius,
    height,
    curveRadius: radius,
    // Flat frames would stand off its curve.
    sticky: false,
    holes: Object.fromEntries(vestibuleArches.map(({name, angle}) => [name, {
      ...vestibuleArchHole,
      u: (angle - middle) * radius,
    }])),
  },
} satisfies Record<string, RoomWall>
