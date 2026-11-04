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

/** The Vesper’s floor plan, from the Cinnabar’s south wall to the Sienna’s north wall’s line, the Banquet’s mirror image across the Lobby, and the height its ceiling springs from. */
export const vesper = {
  center: [roomOrigins.vesper[0], roomOrigins.vesper[2]],
  size: [12, 8 - salonSouthZ],
  height: 5.8,
} as const satisfies FloorRectangle & {height: number}

/** where the orb pedestals stand, in floor tiles from the room’s middle along x and z, every one on a seam across the room, half a tile off its axis, so the two of each row stand 2 m apart, middle to middle: the four round the middle of its north half, from the north-west corner on clockwise as seen from above, then the two level with the room’s middle, east and west */
const orbPedestalTiles = [[-0.5, -4], [0.5, -4], [0.5, -2], [-0.5, -2], [0.5, 0], [-0.5, 0]] as const
/** the middle of the two rows of orb pedestals, in floor tiles from the room’s middle along z */
const orbPedestalMiddle = (Math.min(...orbPedestalTiles.map(([, z]) => z)) + Math.max(...orbPedestalTiles.map(([, z]) => z))) / 2

/** The column pedestals in two rows of three either side of the room’s axis, from the middle of its north half to the room’s own middle, each carrying an orb, in the order of {@link orbPedestalTiles}. */
export const vesperOrbPedestals: ReadonlyArray<VesperOrbPedestal> = orbPedestalTiles.map(([x, z]) => ({
  position: [vesper.center[0] + x * floorTile, 0, vesper.center[1] + z * floorTile],
  rotation: Math.atan2(x, z - orbPedestalMiddle) + 0,
}))
