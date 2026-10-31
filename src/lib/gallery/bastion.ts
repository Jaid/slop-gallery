import type {Wall} from '../placement/wallGeometry.ts'

import cinnabar from './cinnabar.ts'
import {easedRampGradient} from './easedRamp.ts'
import {fortressApproach, fortressClearance, fortressDoorway} from './fortress.ts'
import lowerGallery from './lowerGallery.ts'
import Passage from './passages/Passage.ts'
import PassageRoute from './passages/PassageRoute.ts'
import RoutedPassage from './passages/RoutedPassage.ts'

const {oculus} = lowerGallery
/** the western climb is as wide as the Fortress’ route from the east bridge */
const {width} = fortressDoorway
/** how far the passage’s center line runs from the center line of the Cinnabar’s west wall, which its east leg climbs along */
const offset = fortressClearance + width / 2
/** where the passage leaves the Oculus: level with the end of the west bridge, which climbs to it from the deck, like the Fortress’ doorway at the east one */
const doorwayY = fortressDoorway.y
const doorwayZ = fortressDoorway.z
const mouthHeight = fortressDoorway.height
/** From the top of its climb on, the passage is as tall as the Fortress’ approach into the Lodge. */
const levelHeight = 3.1
const westWallX = oculus.center[0] - oculus.size[0] / 2
const cinnabarWestX = cinnabar.center[0] - cinnabar.size[0] / 2
const cinnabarNorthZ = cinnabar.center[1] - cinnabar.size[1] / 2
/** the Cinnabar’s floor, on the upper floor */
const cinnabarFloorY = 0
/** how steep the hairpin gets halfway, where its eased profile is steepest: like the Fortress’ ramps */
const steepest = 0.25
/** How long a ramp has to be to climb by `rise` without getting steeper than `steepest`. */
const rampLength = (rise: number) => Math.abs(rise) * easedRampGradient(0.5, 1) / steepest
/** the radius of the hairpin’s turn, round whose inner wall a meter of floor is left */
const turnRadius = 3
/** How far past an elbow a straight stretch of vault runs before a hairpin’s ribs begin or a screen wall stands, like the Fortress’ mouth before its curve: an elbow’s reach and 0.8 m more. */
const elbowRun = (passageWidth: number) => passageWidth / 2 + 0.8
/** where the hairpin’s east leg climbs north, behind the Cinnabar’s west wall */
const eastLegX = cinnabarWestX - offset
/** where its west leg climbs south, a turn’s diameter further west */
const westLegX = eastLegX - turnRadius * 2
/** where the mouth turns south into the hairpin, as far north of the doorway’s line as an elbow and a stretch of vault reach */
const turnZ = doorwayZ + elbowRun(width)
/** Both legs climb as much, so the whole hairpin eases up by the bridge’s height to the Cinnabar’s floor without getting steeper than 1 in 4. */
const legLength = (rampLength(cinnabarFloorY - doorwayY) - Math.PI * turnRadius) / 2
/**
 * North of the Cinnabar, between its north wall and the Fortress’ run west to the Lodge, lies a strip too narrow for the passage’s full width: the approach into the Cinnabar runs along its middle, this wide, as wide as the Lodge’s doorway from the Fortress is high.
 */
const stripWidth = 2.6
const stripZ = (cinnabarNorthZ + fortressApproach.path[0][1] + fortressApproach.width / 2) / 2
/** where the broad run north ends in the screen wall, as far south of the strip as an elbow and a stretch of vault reach */
const screenZ = stripZ + elbowRun(stripWidth)

/** The doorway in the Oculus’ west wall at the west bridge’s end: the Fortress’ doorway mirrored across the tower. */
export const bastionDoorway = {
  ...fortressDoorway,
  x: westWallX,
}
/** From the doorway west under the Cinnabar and on past its west wall, round an elbow to the south, level with the bridge’s end. */
export const bastionMouth = new Passage('climb_mouth', 'fortress', [[westWallX, doorwayZ], [westLegX, doorwayZ], [westLegX, turnZ]], doorwayY, width, mouthHeight)
/**
 * South along the west leg, round a hairpin turn toward the east and back north along the east leg behind the Cinnabar’s west wall, easing up all the way from the bridge’s height to the Cinnabar’s floor as its vault rises.
 */
const route = new PassageRoute([westLegX, turnZ], Math.PI / 2, doorwayY, mouthHeight, [
  {
    y: cinnabarFloorY,
    height: levelHeight,
    steps: [
      {length: legLength},
      {
        radius: turnRadius,
        angle: -Math.PI,
      },
      {length: legLength},
    ],
  },
])
export const bastionHairpin = new RoutedPassage('climb_hairpin', 'fortress', route, width)
if (Math.hypot(route.end.point[0] - eastLegX, route.end.point[1] - turnZ) > 1e-6 || Math.abs(route.end.heading + Math.PI / 2) > 1e-9) {
  throw new Error('The Fortress’ hairpin has to end where its run north begins, heading north.')
}
/** From the hairpin’s top on north at the Cinnabar’s floor’s level, over the mouth and then over the Lodge’s roof, to the screen wall. */
export const bastionRun = new Passage('climb_run', 'fortress', [[eastLegX, turnZ], [eastLegX, screenZ]], cinnabarFloorY, width, levelHeight, [], false)
/** From the arch in the screen wall north to the strip, east along it behind the Cinnabar’s north wall and round a last elbow south through the doorway in the middle of that wall. */
export const bastionApproach = new Passage('climb_approach', 'fortress', [[eastLegX, screenZ], [eastLegX, stripZ], [cinnabar.center[0], stripZ], [cinnabar.center[0], cinnabarNorthZ]], cinnabarFloorY, stripWidth, levelHeight, [], false)
/** The arch through the screen wall and through the Cinnabar’s north wall, as wide and as high as the approach’s vault. */
export const bastionArch = {
  width: stripWidth,
  height: levelHeight,
  profile: 'arch',
} as const
/** The screen wall across the end of the run north, which closes its broad vault and opens into the narrow approach through an arch in its middle. */
export const bastionScreen: Wall = {
  id: 'fortress-climb_screen',
  room: 'fortress',
  center: [eastLegX, cinnabarFloorY, screenZ],
  // Facing south, back down the run.
  rotation: 0,
  width,
  height: levelHeight - 0.3,
  sticky: false,
  trimStyle: 'plain',
  cornice: false,
  holes: [
    {
      ...bastionArch,
      name: 'approach',
      u: 0,
    },
  ],
}
/** The Fortress’ western passages from the Oculus to the Cinnabar, each continuing where the one before it ends. */
export const bastionPassages = [bastionMouth, bastionHairpin, bastionRun, bastionApproach] as const

/** how far along the hairpin the apex of its turn lies, halfway round it */
const apex = legLength + Math.PI * turnRadius / 2
/**
 * Which of the straight passages’ evenly spaced lanterns they keep, in mount order from their starts, see CoveredPassage: the mouth the second and the fourth of the four along its run west, which hang under the Cinnabar and before the elbow, and none in its elbow’s span;
 * the run north the middle one of its three; the approach the first of the two along the strip, the one past the elbow at the screen wall.
 */
export const bastionPassageLanterns = {
  mouth: [false, true, false, true, false],
  run: [false, true, false],
  approach: [false, true, false, false],
} as const satisfies Record<string, ReadonlyArray<boolean>>
/** How far along the hairpin its lanterns hang, each between two ribs: halfway up the west leg, round the apex of the turn and halfway up the east leg. */
export const bastionLanterns = {
  west: bastionHairpin.ribGap(legLength / 2),
  turn: bastionHairpin.ribGap(apex),
  east: bastionHairpin.ribGap(route.length - legLength / 2),
} as const
