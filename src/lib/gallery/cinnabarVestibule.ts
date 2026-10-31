import type {RoundVestibule, VestibuleArch} from './roundVestibule.ts'

import {bastionArch} from './bastion.ts'
import {cinnabarVestibule} from './cinnabar.ts'
import roomOrigins from './layout.ts'
import {insideRoundVestibule} from './roundVestibule.ts'

const floorY = roomOrigins.cinnabar[1]

/** The vestibule’s arches: south into the Cinnabar, through the middle of its north wall, and west onto the Fortress’ approach. */
export const vestibuleArches = [
  {
    name: 'cinnabar',
    angle: Math.PI / 2,
  },
  {
    name: 'fortress',
    angle: Math.PI,
  },
] as const satisfies ReadonlyArray<VestibuleArch>

/** The Cinnabar’s vestibule as a round vestibule: every arch lines up with the approach’s vault, which ends where the plane touching the vestibule’s wall at the west arch’s middle crosses its center line. */
export const cinnabarRoundVestibule = {
  center: cinnabarVestibule.center,
  radius: cinnabarVestibule.radius,
  arch: bastionArch,
  arches: vestibuleArches,
} satisfies RoundVestibule

/** The Cinnabar’s floor height under the point in its vestibule, which lies outside its rectangular floor plan: within the round wall’s center line, and on under every arch to the plane touching the wall there. */
export function cinnabarVestibuleFloor(x: number, z: number) {
  return insideRoundVestibule(cinnabarRoundVestibule, x, z) ? floorY : undefined
}
