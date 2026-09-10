import {wallFace} from '../architectureDimensions.ts'
import {lowerGallery} from '../lowerGallery.ts'
import {walls} from '../walls.ts'

const room = lowerGallery.undertone
const stairDoor = walls.find(wall => wall.id === 'undertone-east')!.holes![0]!
const doorMin = stairDoor.u - stairDoor.width / 2
const doorMax = stairDoor.u + stairDoor.width / 2

/** Room-local fixtures leave the entire stair opening and its approach clear. */
export const undertoneWallFixtures = [-1, 1].map(side => ({
  side,
  // The housing's rear face meets the wall, rather than hovering in front of it.
  lightX: side * (room.size[0] / 2 - wallFace - 0.07),
  lightZs: side < 0 ? [-10, -5, 0, 5, 10] : [-10, doorMin - 1, doorMax + 1, 6, 10],
}))
