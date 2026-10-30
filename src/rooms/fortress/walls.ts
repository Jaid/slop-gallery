import {fortressPassages} from '#src/lib/gallery/fortress.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'

import {localWalls} from '../lib/walls.ts'

// The passages’ castle-stone walls, from the Oculus’ east doorway round its apse to the Lodge’s east wall.
export default localWalls('fortress', roomOrigins.fortress, fortressPassages.flatMap(passage => passage.walls))
