import type {WallReservation} from '#src/lib/placement/wallGeometry.ts'
import type {RoomWall} from '../base/Room.ts'

import {alchemyCannon, alchemyPipe, forgeOpeningHole, workbench} from '#src/lib/gallery/alchemy/alchemyMachine.ts'
import {climbArch} from '#src/lib/gallery/climb.ts'
import forge, {forgeVestibule} from '#src/lib/gallery/forge.ts'
import {forgeRoundVestibule} from '#src/lib/gallery/forgeVestibule.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
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
const south = planWall(forge.size, 'south', height)
/** The stretch of the south wall from `west` to `east`, world x coordinates, up to `top` over the floor, which the alchemy machine stands in front of. */
const machineReservation = (westX: number, eastX: number, top: number): WallReservation => {
  const [from, to] = [westX, eastX].map(x => wallCoordinates(south, [x - originX, 0, 0]))
  return {
    u: (from + to) / 2,
    width: Math.abs(to - from),
    height: top,
    profile: 'rectangle',
  }
}
const [benchX] = workbench.center
const riserX = alchemyPipe.corners[1][0]

export default {
  // The arch into the vestibule, where its round wall touches the middle of this one, as wide and as high as the approach’s vault, and over it the round opening the alchemy machine’s cannon shoots orbs through.
  north: {
    ...north,
    holes: {
      vestibule: {
        ...climbArch,
        u: wallCoordinates(north, [vestibuleX - originX, 0, vestibuleZ + radius - originZ]),
      },
      orbs: forgeOpeningHole(north, roomOrigins.forge),
    },
  },
  // The cast-glass window into the Lobby, the Salon’s mirrored, whose glass stands in the shared plane.
  east: {
    ...east,
    holes: {
      lobby_window: lobbyWindowHole(forgeWindow, east, roomOrigins.forge),
    },
  },
  // Behind the alchemy machine: its workbench, and the pipe and the cannon on the wall over it.
  south: {
    ...south,
    reservations: [
      machineReservation(benchX - workbench.length / 2, benchX + workbench.length / 2, workbench.height + 0.1),
      machineReservation(benchX - 0.35, riserX + alchemyPipe.radius + 0.1, alchemyCannon.muzzle[1] + 0.35),
    ],
  },
  west,
  // The vestibule’s round wall, one ring facing its center, with the arch back into the room, the one out onto the Bastion’s approach and, over the arch into the room, the opening orbs fly in by.
  vestibule: {
    ...vestibule,
    holes: {
      ...vestibule.holes,
      orbs: forgeOpeningHole(vestibule, roomOrigins.forge),
    },
  },
} satisfies Record<string, RoomWall>
