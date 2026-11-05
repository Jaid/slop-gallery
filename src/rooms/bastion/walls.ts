import {bastionNetwork} from '#src/lib/gallery/bastionNetwork.ts'
import {climbScreen} from '#src/lib/gallery/climb.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'

import {localWalls} from '../lib/walls.ts'

// The connected passage network’s walls and the screen before its narrow Forge approach.
export default localWalls('bastion', roomOrigins.bastion, [...bastionNetwork.flatMap(passage => passage.walls), climbScreen])
