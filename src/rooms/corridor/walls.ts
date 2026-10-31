import {corridorWalls} from '#src/lib/gallery/corridor.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'

import {localWalls} from '../lib/walls.ts'

// The timber lining from the Lodge’s bay round to the long hall and down it, with the cutout for the Lodge’s window in the hall’s east wall, and the walls along the stair flight up to the Sienna.
export default localWalls('corridor', roomOrigins.corridor, corridorWalls, {
  wall_3: ['lodge_window'],
})
