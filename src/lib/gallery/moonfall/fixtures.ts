import {wallFace} from '../architectureDimensions.ts'
import lowerGallery from '../lowerGallery.ts'
import walls from '../walls.ts'

const room = lowerGallery.moonfall
const stairDoor = walls.find(wall => wall.id === 'moonfall-east')!.holes![0]
const doorMin = stairDoor.u - stairDoor.width / 2
const doorMax = stairDoor.u + stairDoor.width / 2
/** Room-local fixtures leave the entire stair opening and its approach clear. */
const moonfallWallFixtures = [-1, 1].map(side => ({
  side,
  // The housing's rear face meets the wall, rather than hovering in front of it.
  lightX: side * (room.size[0] / 2 - wallFace - 0.07),
  // Four down the west wall, leaving its middle dark; on the east only the pair flanking the stair door, whose lights hang lower and brighter.
  lightZs: side < 0 ? [-10, -5, 5, 10] : [doorMin - 1, doorMax + 1],
  lamp: side < 0 ? {
    y: 2.8,
    intensity: 5,
    distance: 6,
  } : {
    y: 2.2,
    intensity: 15,
    distance: 10,
  },
}))

export default moonfallWallFixtures
