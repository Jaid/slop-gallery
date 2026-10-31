import type {FloorRectangle} from './floors.ts'

import roomOrigins from './layout.ts'
import {salonSouthZ} from './salon.ts'

/** The Vesper’s floor plan, from the Cinnabar’s south wall to the Sienna’s north wall’s line, the Banquet’s mirror image across the Lobby, and the height its ceiling springs from. */
export const vesper = {
  center: [roomOrigins.vesper[0], roomOrigins.vesper[2]],
  size: [12, 8 - salonSouthZ],
  height: 5.8,
} as const satisfies FloorRectangle & {height: number}
