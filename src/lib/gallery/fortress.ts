import type {RouteOpening} from './passages/RoutedPassage.ts'
import type {Vec3} from './types.ts'

import {corniceBands, wallOpeningTrim} from './architectureDimensions.ts'
import {easedRampGradient} from './easedRamp.ts'
import lodge from './lodge.ts'
import lowerGallery, {oculusPlatform} from './lowerGallery.ts'
import oculusApse from './oculusApse.ts'
import oculusTower, {towerBridge} from './oculusTower.ts'
import Passage from './passages/Passage.ts'
import PassageRoute from './passages/PassageRoute.ts'
import PassageTransition from './passages/PassageTransition.ts'
import RoutedPassage from './passages/RoutedPassage.ts'

/** an opening through the apse’s round wall into the Fortress behind it, barred with iron: centered at a polar `angle` round the center of the apse’s arc it pierces; its `width` runs along the wall’s center line, and its `bottom`, `height` and the `rise` of its segmental arch stand over the platform */
export type ApseOpening = {
  angle: number
  /** which of the apse’s arcs it pierces: 0 the west shoulder, 1 the crown and 2 the east shoulder */
  arc: number
  /** the heights of the flat iron bands across its bars, over the platform */
  bands: ReadonlyArray<number>
  bottom: number
  height: number
  /** its name among the holes of its walls */
  name: string
  rise: number
  width: number
}

const {oculus} = lowerGallery
const width = lodge.passageWidth
/** how far the passage’s walls stand behind the Oculus’ */
export const fortressClearance = 0.3
/** how far the passage’s center line runs from the center lines of the Oculus’ walls */
const offset = fortressClearance + width / 2
/** where the passage leaves the Oculus: level with the end of the east bridge, which climbs to it from the deck */
const doorwayY = oculusTower.floorY + oculusTower.height + towerBridge.rise
const [lowerBand] = corniceBands
/** where the Oculus’ walls end, 30 cm under its ceiling */
const oculusWallTop = oculus.ceiling.topY - oculus.ceiling.thickness - 0.3
/** high enough for the casing round the arch of its doorway in the Oculus’ east wall to run up into the lower band of that wall’s cornice and end flush with its top, joining the cornice */
const mouthHeight = oculusWallTop - lowerBand.drop + lowerBand.height / 2 - wallOpeningTrim - doorwayY
/** The approach to the Lodge keeps the height the whole passage used to have. */
const approachHeight = 3.1
/** Round the apse, at the platform’s level, it rises high enough for the gate and the windows into the apse, casings included, to stay under where its vault springs from its walls. */
const apseHeight = 5.2
const platformY = oculusPlatform.position[1] + oculusPlatform.size[1] / 2
const eastWallX = oculus.center[0] + oculus.size[0] / 2
/** where the passage runs north along the Oculus’ east wall */
const runX = eastWallX + offset
/** where the mouth hands over to the curve, past the elbow behind the doorway, so a stretch of vault separates the elbow from the curve’s ribs */
const curveZ = oculusTower.z - width / 2 - 0.8
/** how long the run north along the Oculus is, from the mouth to where the apse begins */
const runLength = curveZ - oculusApse.northZ
/** how steep the Fortress’ ramps get halfway, where their eased profile is steepest: like the straight ramps they replaced */
const steepest = 0.25
/** How long a ramp has to be to climb or fall by `rise` without getting steeper than `steepest`. */
const rampLength = (rise: number) => Math.abs(rise) * easedRampGradient(0.5, 1) / steepest

/** The doorway in the Oculus’ east wall at the east bridge’s end, as wide and as high as the passage, its floor level with the bridge’s end. */
export const fortressDoorway = {
  x: eastWallX,
  y: doorwayY,
  z: oculusTower.z,
  width,
  height: mouthHeight,
}
/** From the doorway east and round an elbow to the north, level with the bridge’s end. */
export const fortressMouth = new Passage('mouth', 'fortress', [[eastWallX, oculusTower.z], [runX, oculusTower.z], [runX, curveZ]], doorwayY, width, mouthHeight)

const [west, crown, east] = oculusApse.arcs
const eastRadius = east.radius + offset
/** The ramp down from the doorway to the platform’s level runs on past the run north into the turn round the apse’s east shoulder, this far round it. */
const eastRampTurn = (rampLength(platformY - doorwayY) - runLength) / eastRadius
/** the radius of the bend that takes the curve out of the apse’s west shoulder, in an S, back west toward the Lodge; tight, so the curve keeps to the shoulder long enough for its window */
const bendRadius = 3
const westRadius = west.radius + offset
// The bend is tangent to the run toward the Lodge, its center north of the run, and to the turn round the west shoulder, outside of it.
const bendCenterZ = lodge.tunnelZ - bendRadius
const bendCenterX = west.center[0] - Math.sqrt((westRadius + bendRadius) ** 2 - (bendCenterZ - west.center[1]) ** 2)
/** where the bend leaves the turn round the west shoulder, as the polar angle round that shoulder’s center */
const bendAngle = Math.atan2(bendCenterZ - west.center[1], bendCenterX - west.center[0]) + Math.PI * 2
/** how far round the west shoulder the curve turns before the bend takes over */
const westTurn = west.to - bendAngle
/** how far the bend turns back: past west, the crown’s second half turned the curve, and the west shoulder on top of that */
const bendTurn = (crown.to - crown.from) / 2 + westTurn
/** The ramp up to the Lodge’s floor starts with the bend, and a run as long as it takes finishes it. */
const climbLength = rampLength(lodge.floorY - platformY) - bendRadius * bendTurn
/** a window’s width along the apse’s wall, a little narrower than the gate */
const windowWidth = 2.4
/** where the windows pierce the shoulders: the west one halfway along the stretch of its shoulder the curve still runs behind, from where the bend leaves it to the crown, and the east one mirrored */
const windowAngle = (bendAngle + west.to) / 2
/** The gate in the middle of the apse and a window in each of its shoulders, all opening onto the curve behind them. */
export const apseOpenings: ReadonlyArray<ApseOpening> = [
  {
    name: 'west_window',
    arc: 0,
    angle: windowAngle,
    width: windowWidth,
    bottom: 1.1,
    height: 2.9,
    rise: 0.6,
    bands: [1.7],
  },
  {
    name: 'gate',
    arc: 1,
    angle: Math.PI * 3 / 2,
    width: 3,
    bottom: 0,
    height: 3,
    rise: 0.9,
    // low over the floor and on up its leaves, like a gate’s rails
    bands: [0.15, 1.05, 1.95],
  },
  {
    name: 'east_window',
    arc: 2,
    angle: Math.PI * 3 - windowAngle,
    width: windowWidth,
    bottom: 1.1,
    height: 2.9,
    rise: 0.6,
    bands: [1.7],
  },
]
/** Where an opening’s middle lies on the center line of the apse’s wall, or `out` meters further out round the same center. */
export function apseOpeningPoint({arc, angle}: Pick<ApseOpening, 'angle' | 'arc'>, out = 0) {
  const {center, radius} = oculusApse.arcs[arc]
  return [center[0] + Math.cos(angle) * (radius + out), center[1] + Math.sin(angle) * (radius + out)] as const
}

/**
 * North along the Oculus’ east wall, easing down to the platform’s level as its vault rises, on into the turn round the apse’s east shoulder, then round the apse at the same distance from its walls, over its crown and into its west shoulder, from where an S bend brings it back west, easing up as gently to the Lodge’s floor.
 * Its center line runs `offset` meters from the apse’s, so its turns share their centers with the apse’s arcs.
 */
const route = new PassageRoute([runX, curveZ], -Math.PI / 2, doorwayY, mouthHeight, [
  {
    y: platformY,
    height: apseHeight,
    steps: [
      {length: runLength},
      {
        radius: eastRadius,
        angle: -eastRampTurn,
      },
    ],
  },
  {
    radius: eastRadius,
    angle: -(east.to - east.from - eastRampTurn),
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
    y: lodge.floorY,
    height: approachHeight,
    steps: [
      {
        radius: bendRadius,
        angle: bendTurn,
      },
      {length: climbLength},
    ],
  },
])
const approachX = bendCenterX - climbLength
if (Math.hypot(route.end.point[0] - approachX, route.end.point[1] - lodge.tunnelZ) > 1e-6) {
  throw new Error('The Fortress’ curve has to end where its approach to the Lodge begins.')
}
/** The openings as seen from the curve: in its left wall, the one toward the apse, as far round as they are on the apse and as wide there, so their jambs point to the arcs’ centers. */
const curveOpenings = apseOpenings.map((opening): RouteOpening => {
  const {name, width: openingWidth, bottom, height, rise} = opening
  const {radius} = oculusApse.arcs[opening.arc]
  const [x, z] = apseOpeningPoint(opening, offset)
  return {
    name,
    along: route.project(x, z)!.along,
    side: -1,
    width: openingWidth * (radius + fortressClearance) / radius,
    bottom,
    height,
    rise,
    profile: 'arch',
  }
})
// The ramps level out at the platform before the casings round the windows begin, so their sills stand as high over the floor all along.
for (const {arc, angle, width: openingWidth} of apseOpenings) {
  const {radius} = oculusApse.arcs[arc]
  const reach = openingWidth / 2 / radius + wallOpeningTrim / (radius + fortressClearance)
  for (const side of [-1, 1]) {
    const [x, z] = apseOpeningPoint({
      arc,
      angle: angle + side * reach,
    }, offset)
    if (route.at(route.project(x, z)!.along).y !== platformY) {
      throw new Error('The Fortress’ ramps have to level out before the openings into the apse.')
    }
  }
}
export const fortressCurve = new RoutedPassage('curve', 'fortress', route, width, curveOpenings)
/** From the curve west to the Lodge’s east wall, where it turns into the Lodge’s timber. */
export const fortressApproach = new Passage('approach', 'fortress', [[approachX, lodge.tunnelZ], [lodge.center[0] + lodge.size[0] / 2, lodge.tunnelZ]], lodge.floorY, width, approachHeight)
/** The approach’s last meter trades the castle stone for the Lodge’s timber, instead of switching at the doorway. */
export const fortressTransition = new PassageTransition(fortressApproach)
/** how far along the curve the middle of its crown lies, behind the gate */
const crownMiddle = route.project(...apseOpeningPoint({
  arc: 1,
  angle: Math.PI * 3 / 2,
}, offset))!.along
const crownStation = route.at(crownMiddle)
/** where the Fortress’ origin lies: on the floor in the middle of the curve’s crown */
export const fortressOrigin: Vec3 = [crownStation.point[0], crownStation.y, crownStation.point[1]]
/** how far from a rib’s middle a lantern hangs at least, so its canopy sits on the bare vault beside the rib */
const ribClearance = 0.3
/** Right behind the opening `along` meters down the curve, or just beside a rib that stands in the way, on the opening’s side of it. */
const behind = (along: number) => {
  const rib = fortressCurve.ribs.find(value => Math.abs(value - along) < ribClearance)
  return rib === undefined ? along : rib + (along < rib ? -ribClearance : ribClearance)
}
/**
 * How far along the curve its lanterns hang: a little way into the run north from the mouth, between two ribs, and behind each opening into the apse, whose light throws the bars’ shadows onto the platform.
 */
export const fortressLanterns = {
  east: fortressCurve.ribGap(2),
  north: behind(crownMiddle),
  northwest: behind(curveOpenings[0].along),
  northeast: behind(curveOpenings[2].along),
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
