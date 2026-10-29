import roomOrigins from '#src/lib/gallery/layout.ts'
import {lodgeTunnelWalls} from '#src/lib/gallery/lodge.ts'

import {localWalls} from '../lib/walls.ts'

// The passage’s castle-stone walls, from the Oculus’ north arch to the Lodge’s east wall.
export default localWalls('fortress', roomOrigins.fortress, lodgeTunnelWalls)
