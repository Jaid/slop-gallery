import type {Vec3} from './types.ts'

import lodge from './lodge.ts'
import lowerGallery from './lowerGallery.ts'
import oculusApse from './oculusApse.ts'
import oculusTower from './oculusTower.ts'
import Passage from './passages/Passage.ts'
import PassageRoute from './passages/PassageRoute.ts'
import PassageTransition from './passages/PassageTransition.ts'
import RoutedPassage from './passages/RoutedPassage.ts'

const {oculus} = lowerGallery
const width = lodge.passageWidth
/** low enough for the arch and casing of its doorway in the Oculus’ east wall to stay below that wall’s cornice */
const height = 3.1
/** how far the passage’s walls stand behind the Oculus’ */
const clearance = 0.3
/** how far the passage’s center line runs from the center lines of the Oculus’ walls */
const offset = clearance + width / 2
const deckY = oculusTower.floorY + oculusTower.height
const eastWallX = oculus.center[0] + oculus.size[0] / 2
/** where the passage runs north along the Oculus’ east wall */
const runX = eastWallX + offset
/** where the mouth hands over to the curve, past the elbow behind the doorway, so a stretch of vault separates the elbow from the curve’s ribs */
const curveZ = oculusTower.z - width / 2 - 0.8

/** The doorway in the Oculus’ east wall at the east bridge’s end, as wide and as high as the passage, its floor level with the tower’s deck. */
export const fortressDoorway = {
  x: eastWallX,
  y: deckY,
  z: oculusTower.z,
  width,
  height,
}
/** From the doorway east and round an elbow to the north, level with the deck. */
export const fortressMouth = new Passage('mouth', 'fortress', [[eastWallX, oculusTower.z], [runX, oculusTower.z], [runX, curveZ]], deckY, width, height)

const [west, crown, east] = oculusApse.arcs
/** the radius of the bend that takes the curve out of the apse’s west shoulder, in an S, back west into the run toward the Lodge */
const bendRadius = 4
const westRadius = west.radius + offset
// The bend is tangent to the run toward the Lodge, its center north of the run, and to the turn round the west shoulder, outside of it.
const bendCenterZ = lodge.tunnelZ - bendRadius
const bendCenterX = west.center[0] - Math.sqrt((westRadius + bendRadius) ** 2 - (bendCenterZ - west.center[1]) ** 2)
/** where the bend leaves the turn round the west shoulder, as the polar angle round that shoulder’s center */
const bendAngle = Math.atan2(bendCenterZ - west.center[1], bendCenterX - west.center[0]) + Math.PI * 2
/** how far round the west shoulder the curve turns before the bend takes over */
const westTurn = west.to - bendAngle
/**
 * North along the Oculus’ east wall, falling to the Lodge’s floor, then round the apse at the same distance from its walls, over its east shoulder, its crown and into its west shoulder, from where an S bend brings it back west toward the Lodge.
 * Its center line runs `offset` meters from the apse’s, so its turns share their centers with the apse’s arcs.
 */
const route = new PassageRoute([runX, curveZ], -Math.PI / 2, deckY, [
  {
    length: curveZ - oculusApse.northZ,
    rise: lodge.floorY - deckY,
  },
  {
    radius: east.radius + offset,
    angle: -(east.to - east.from),
  },
  {
    radius: crown.radius + offset,
    angle: -(crown.to - crown.from),
  },
  {
    radius: westRadius,
    angle: -westTurn,
  },
  {
    // Past west, the crown’s second half turned it, and the west shoulder on top of that.
    radius: bendRadius,
    angle: (crown.to - crown.from) / 2 + westTurn,
  },
])
if (Math.hypot(route.end.point[0] - bendCenterX, route.end.point[1] - lodge.tunnelZ) > 1e-6) {
  throw new Error('The Fortress’ curve has to end where its run toward the Lodge begins.')
}
export const fortressCurve = new RoutedPassage('curve', 'fortress', route, width, height)
/** From the curve west to the Lodge’s east wall, where it turns into the Lodge’s timber. */
export const fortressApproach = new Passage('approach', 'fortress', [[bendCenterX, lodge.tunnelZ], [lodge.center[0] + lodge.size[0] / 2, lodge.tunnelZ]], lodge.floorY, width, height)
/** The approach’s last meter trades the castle stone for the Lodge’s timber, instead of switching at the doorway. */
export const fortressTransition = new PassageTransition(fortressApproach)
/** how far along the curve the middle of its crown lies, north of the apse */
const crownMiddle = route.pieces[0].length + route.pieces[1].length + route.pieces[2].length / 2
const crownStation = route.at(crownMiddle)
/** where the Fortress’ origin lies: on the floor in the middle of the curve’s crown */
export const fortressOrigin: Vec3 = [crownStation.point[0], crownStation.y, crownStation.point[1]]
/** How far along the curve its two lanterns hang: a little way into the run north from the mouth and at the top of the curve, each between two ribs, so it hangs from the bare vault. */
export const fortressLanterns = {
  east: fortressCurve.ribGap(2),
  north: fortressCurve.ribGap(crownMiddle),
} as const
/** The Fortress’ passages from the Oculus to the Lodge, each continuing where the one before it ends. */
export const fortressPassages = [fortressMouth, fortressCurve, fortressApproach] as const

/** The height of the Fortress’ floor under the point, or undefined beside it. */
export function fortressFloor(x: number, z: number) {
  for (const passage of fortressPassages) {
    const floor = passage.floorAt(x, z)
    if (floor !== undefined) {
      return floor
    }
  }
}

/** Whether the position lies in the Fortress, from a meter under its floor to its ceiling. */
export function insideFortress(position: Vec3) {
  return fortressPassages.some(passage => passage.contains(position))
}
