import type {RoundVestibule, VestibuleArch} from './roundVestibule.ts'

import {climbArch} from './climb.ts'
import {forgeVestibule} from './forge.ts'
import roomOrigins from './layout.ts'
import {insideRoundVestibule} from './roundVestibule.ts'

const floorY = roomOrigins.forge[1]

/** The vestibule’s arches: south into the Forge, through the middle of its north wall, and west onto the Bastion’s approach. */
export const vestibuleArches = [
  {
    name: 'forge',
    angle: Math.PI / 2,
  },
  {
    name: 'bastion',
    angle: Math.PI,
  },
] as const satisfies ReadonlyArray<VestibuleArch>

/** The Forge’s vestibule as a round vestibule: every arch lines up with the approach’s vault, which ends where the plane touching the vestibule’s wall at the west arch’s middle crosses its center line. */
export const forgeRoundVestibule = {
  center: forgeVestibule.center,
  radius: forgeVestibule.radius,
  arch: climbArch,
  arches: vestibuleArches,
} satisfies RoundVestibule

/** The Forge’s floor height under the point in its vestibule, which lies outside its rectangular floor plan: within the round wall’s center line, and on under every arch to the plane touching the wall there. */
export function forgeVestibuleFloor(x: number, z: number) {
  return insideRoundVestibule(forgeRoundVestibule, x, z) ? floorY : undefined
}
