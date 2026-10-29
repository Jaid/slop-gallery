import {corridorWalls} from '#src/lib/gallery/corridor.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'

import {localWalls} from '../lib/walls.ts'

// The timber lining down the long hall, with the cutout for the Lodge’s window, and the walls along the stair flight up to the Sienna.
export default localWalls('corridor', roomOrigins.corridor, corridorWalls, {
  wall_5: ['lodge_window'],
})
