import {wallFace} from '../architectureDimensions.ts'
import lowerGallery from '../lowerGallery.ts'
import staircase from '../staircase.ts'

const room = lowerGallery.moonfall
/** the door in the east wall where the stairway from the Antechamber arrives, along the wall from the room’s middle */
const doorMin = staircase.returnZ - room.center[1] - staircase.lowerWidth / 2
const doorMax = staircase.returnZ - room.center[1] + staircase.lowerWidth / 2
/** Room-local fixtures leave the entire stair opening and its approach clear. */
const moonfallWallFixtures = [-1, 1].map(side => ({
  side,
  // The housing's rear face meets the wall, rather than hovering in front of it.
  lightX: side * (room.size[0] / 2 - wallFace - 0.07),
  // Four down the west wall, leaving its middle dark; on the east only the pair flanking the stair door.
  lightZs: side < 0 ? [-10, -5, 5, 10] : [doorMin - 1, doorMax + 1],
}))

export default moonfallWallFixtures
