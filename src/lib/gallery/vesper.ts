import type {FloorRectangle} from './floors.ts'
import type {Vec3} from './types.ts'

import roomOrigins from './layout.ts'
import {salonSouthZ} from './salon.ts'

/** a column pedestal carrying an orb in its holder */
export type VesperOrbPedestal = {
  /** the middle of its foot */
  position: Vec3
  /** its turn about y, which faces its holder’s front foot out from the middle of the square the pedestals stand round */
  rotation: number
}

/** The Vesper’s floor plan, from the Cinnabar’s south wall to the Sienna’s north wall’s line, the Banquet’s mirror image across the Lobby, and the height its ceiling springs from. */
export const vesper = {
  center: [roomOrigins.vesper[0], roomOrigins.vesper[2]],
  size: [12, 8 - salonSouthZ],
  height: 5.8,
} as const satisfies FloorRectangle & {height: number}

/** how far the middle of the square the orb pedestals stand round lies north of the room’s middle, as far as the apple’s pedestal lies south of it */
const orbSquareShift = 5
/** how far each orb pedestal stands from the middle of their square along both axes, which leaves a walk of nearly 2 m between neighboring plinths */
const orbSquareSpread = 1.2

/** The four column pedestals at the corners of a square in the middle of the room’s north half, one for every orb, from the north-west corner on clockwise as seen from above. */
export const vesperOrbPedestals: ReadonlyArray<VesperOrbPedestal> = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sideX, sideZ]) => ({
  position: [vesper.center[0] + sideX * orbSquareSpread, 0, vesper.center[1] - orbSquareShift + sideZ * orbSquareSpread],
  rotation: Math.atan2(sideX, sideZ),
}))
