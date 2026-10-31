import {bastionPassages, bastionScreen} from '#src/lib/gallery/bastion.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'

import {localWalls} from '../lib/walls.ts'

// The passages’ castle-stone walls, from the Oculus’ west doorway under the Cinnabar, up the hairpin and round to its north wall, and the screen wall where the broad run north hands over to the narrow approach.
export default localWalls('bastion', roomOrigins.bastion, [...bastionPassages.flatMap(passage => passage.walls), bastionScreen])
