import type {Vec3} from './types.ts'

import {bastionOrigin} from './bastion.ts'
import cinnabar from './cinnabar.ts'
import corridor from './corridor.ts'
import {fortressOrigin} from './fortress.ts'
import lobby from './lobby.ts'
import lodge from './lodge.ts'
import lowerGallery, {tunnelCenter} from './lowerGallery.ts'
import salon, {salonSouthZ} from './salon.ts'
import staircase from './staircase.ts'

const {moonfall, oculus} = lowerGallery
/**
 * Where the gallery’s layout puts the origin of each of its rooms, usually the middle of its main floor, in the museum’s meters. The geometry modules lay the museum out in these coordinates;
 * the rooms take what they need relative to their origin, and the gallery places them back at it.
 */
const roomOrigins = {
  lobby: [0, 0, (lobby.northZ + lobby.southZ) / 2],
  // From the Cinnabar’s south wall to the Sienna’s north wall’s line, the Banquet’s mirror image.
  vesper: [-14, 0, (salonSouthZ + 8) / 2],
  // From the Salon’s south wall to the Vesper’s south wall’s line.
  banquet: [14, 0, (salonSouthZ + 8) / 2],
  antechamber: [0, 0, staircase.z],
  sienna: [-14, 0, 14],
  salon: [salon.center[0], 0, salon.center[1]],
  cinnabar: [cinnabar.center[0], 0, cinnabar.center[1]],
  moonfall: [moonfall.center[0], lowerGallery.floorY, moonfall.center[1]],
  corridor: [corridor.center[0], corridor.floorY, corridor.center[1]],
  oculus: [oculus.center[0], oculus.floorY, oculus.center[1]],
  exhibition: tunnelCenter,
  lodge: [lodge.center[0], lodge.floorY, lodge.center[1]],
  // in the middle of the curve round the Oculus’ apse
  fortress: fortressOrigin,
  // at the apex of the hairpin’s turn, halfway up its climb
  bastion: bastionOrigin,
} as const satisfies Record<string, Vec3>

export default roomOrigins
