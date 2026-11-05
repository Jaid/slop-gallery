import type {FloorRectangle} from './floors.ts'
import type {Vec3} from './types.ts'

import {floorTile} from './floors.ts'
import roomOrigins from './layout.ts'
import {salonSouthZ} from './salon.ts'

/** a column pedestal carrying an orb in its holder */
export type VesperOrbPedestal = {
  /** the middle of its foot */
  position: Vec3
  /** its turn about y, which faces its holder’s front foot out from the middle of the rows the pedestals stand in */
  rotation: number
}

/** The Vesper’s floor plan, from the Forge’s south wall to the Sienna’s north wall’s line, the Banquet’s mirror image across the Lobby, and the height its ceiling springs from. */
export const vesper = {
  center: [roomOrigins.vesper[0], roomOrigins.vesper[2]],
  size: [12, 8 - salonSouthZ],
  height: 5.8,
} as const satisfies FloorRectangle & {height: number}

/** The four pedestals form a 2 m × 4 m rectangle over two northern floor-tile rows, ordered clockwise from the north-west corner. */
const orbPedestalTiles = [[-0.5, -3.5], [0.5, -3.5], [0.5, -1.5], [-0.5, -1.5]] as const
/** the middle of the two rows of orb pedestals, in floor tiles from the room’s middle along z */
const orbPedestalMiddle = (Math.min(...orbPedestalTiles.map(([, z]) => z)) + Math.max(...orbPedestalTiles.map(([, z]) => z))) / 2

/** Four column pedestals in two rows of two in the Vesper’s north half, each carrying an orb, in the order of {@link orbPedestalTiles}. */
export const vesperOrbPedestals: ReadonlyArray<VesperOrbPedestal> = orbPedestalTiles.map(([x, z]) => ({
  position: [vesper.center[0] + x * floorTile, 0, vesper.center[1] + z * floorTile],
  rotation: Math.atan2(x, z - orbPedestalMiddle) + 0,
}))
