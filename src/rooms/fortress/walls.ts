import {bastionScreen} from '#src/lib/gallery/bastion.ts'
import {fortressNetwork} from '#src/lib/gallery/fortressNetwork.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'

import {localWalls} from '../lib/walls.ts'

// The connected passage network’s walls and the screen before its narrow Cinnabar approach.
export default localWalls('fortress', roomOrigins.fortress, [...fortressNetwork.flatMap(passage => passage.walls), bastionScreen])
