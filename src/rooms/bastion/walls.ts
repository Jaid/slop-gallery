import {bastionNetwork} from '#src/lib/gallery/bastionNetwork.ts'
import {climbScreen} from '#src/lib/gallery/climb.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'

import {localWalls} from '../lib/walls.ts'

/** The Bastion's taller stone skirting: 30 cm lower band and 10 cm projecting cap. */
export const bastionBaseboard = {
  baseboardCapHeight: 0.1,
  baseboardHeight: 0.4,
} as const

// The connected passage network’s walls and the screen before its narrow Forge approach.
const walls = localWalls('bastion', roomOrigins.bastion, [...bastionNetwork.flatMap(passage => passage.walls), climbScreen])
export default Object.fromEntries(Object.entries(walls).map(([id, wall]) => [id, {
  ...wall,
  ...bastionBaseboard,
}]))
