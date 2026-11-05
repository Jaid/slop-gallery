import type {Wall} from '../placement/wallGeometry.ts'

import {bastionClearance, bastionDoorway} from './bastion.ts'
import {easedRampGradient} from './easedRamp.ts'
import forge, {forgeVestibule} from './forge.ts'
import lowerGallery from './lowerGallery.ts'
import Passage from './passages/Passage.ts'
import PassageRoute from './passages/PassageRoute.ts'
import RoutedPassage from './passages/RoutedPassage.ts'

const {oculus} = lowerGallery
/** the western climb is as wide as the Bastion’s route from the east bridge */
const {width} = bastionDoorway
/** how far the passage’s center line runs from the center line of the Forge’s west wall, which its east leg climbs along */
const offset = bastionClearance + width / 2
/** where the passage leaves the Oculus: level with the end of the west bridge, which climbs to it from the deck, like the Bastion’s doorway at the east one */
const doorwayY = bastionDoorway.y
const doorwayZ = bastionDoorway.z
const mouthHeight = bastionDoorway.height
/** From the top of its climb on, the passage is as tall as the Bastion’s approach into the Lodge. */
const levelHeight = 3.1
const westWallX = oculus.center[0] - oculus.size[0] / 2
const forgeWestX = forge.center[0] - forge.size[0] / 2
/** where the approach ends at the west arch of the Forge’s round vestibule: on the plane touching the vestibule’s wall at the arch’s middle */
const vestibuleWestX = forgeVestibule.center[0] - forgeVestibule.radius
/** the Forge’s floor, on the upper floor */
const forgeFloorY = 0
/** where the hairpin tops out: the run north from it eases up by half a meter more to the Forge’s floor, a fall gentle enough to walk without noticing, which keeps orbs rolling on down it */
const hairpinTopY = forgeFloorY - 0.5
/** how steep the hairpin gets halfway, where its eased profile is steepest: like the Bastion’s ramps */
const steepest = 0.25
/** How long a ramp has to be to climb by `rise` without getting steeper than `steepest`. */
const rampLength = (rise: number) => Math.abs(rise) * easedRampGradient(0.5, 1) / steepest
/** the radius of the hairpin’s turn, round whose inner wall a meter of floor is left */
const turnRadius = 3
/** How far past an elbow a straight stretch of vault runs before a hairpin’s ribs begin or a screen wall stands, like the Bastion’s mouth before its curve: an elbow’s reach and 0.8 m more. */
const elbowRun = (passageWidth: number) => passageWidth / 2 + 0.8
/** where the hairpin’s east leg climbs north, behind the Forge’s west wall */
const eastLegX = forgeWestX - offset
/** where its west leg climbs south, a turn’s diameter further west */
const westLegX = eastLegX - turnRadius * 2
/** where the mouth turns south into the hairpin, as far north of the doorway’s line as an elbow and a stretch of vault reach */
const turnZ = doorwayZ + elbowRun(width)
/** Both legs climb as much, so the whole hairpin eases up from the bridge’s height to its top without getting steeper than 1 in 4. */
const legLength = (rampLength(hairpinTopY - doorwayY) - Math.PI * turnRadius) / 2
/** The approach into the Forge’s vestibule is narrower than the passage, as wide as the Lodge’s doorway from the Bastion is high. */
const stripWidth = 2.6
/** where it runs east, straight at the vestibule’s middle */
const stripZ = forgeVestibule.center[1]
/** the radius of the approach’s turn from the run north into the strip east, round whose outer wall whatever rolls out of the vestibule is carried on down the run */
const approachTurn = 3
/** where the broad run north ends in the screen wall, where the approach turns east toward the strip */
const screenZ = stripZ + approachTurn

/** The doorway in the Oculus’ west wall at the west bridge’s end: the Bastion’s doorway mirrored across the tower. */
export const climbDoorway = {
  ...bastionDoorway,
  x: westWallX,
}
/** From the doorway west under the Forge and on past its west wall, round an elbow to the south, level with the bridge’s end. */
export const climbMouth = new Passage('climb_mouth', 'bastion', [[westWallX, doorwayZ], [westLegX, doorwayZ], [westLegX, turnZ]], doorwayY, width, mouthHeight)
/**
 * South along the west leg, round a hairpin turn toward the east and back north along the east leg behind the Forge’s west wall, easing up all the way from the bridge’s height to its top as its vault rises.
 */
const route = new PassageRoute([westLegX, turnZ], Math.PI / 2, doorwayY, mouthHeight, [
  {
    y: hairpinTopY,
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
/**
 * Orbs released in the Forge roll down the hairpin on their own: down its east leg, round the outer wall of its turn and out of it along the west leg’s west wall, straight on across the mouth’s elbow to the gate in its north wall, see `bastionLinkGate`.
 */
export const climbHairpin = new RoutedPassage('climb_hairpin', 'bastion', route, width)
if (Math.hypot(route.end.point[0] - eastLegX, route.end.point[1] - turnZ) > 1e-6 || Math.abs(route.end.heading + Math.PI / 2) > 1e-9) {
  throw new Error('The Bastion’s hairpin has to end where its run north begins, heading north.')
}
/** how far short of the screen wall the run levels out at the Forge’s floor, so the walls along it there stand level and meet the screen wall in mitered corners */
const screenRun = 1
/** From the hairpin’s top on north, over the mouth and then over the Lodge’s roof, easing up to the Forge’s floor a meter short of the screen wall. */
export const climbRun = new RoutedPassage('climb_run', 'bastion', new PassageRoute([eastLegX, turnZ], -Math.PI / 2, hairpinTopY, levelHeight, [
  {
    y: forgeFloorY,
    steps: [{length: turnZ - screenZ - screenRun}],
  },
  {length: screenRun},
]), width, {cornice: false})
/** how long the approach’s straight stretch is, from its turn to the vestibule’s arch */
const approachStraight = vestibuleWestX - eastLegX - approachTurn
/** From the arch in the screen wall north round a smooth turn east, then straight on to the west arch of the Forge’s vestibule. */
export const climbApproach = new RoutedPassage('climb_approach', 'bastion', new PassageRoute([eastLegX, screenZ], -Math.PI / 2, forgeFloorY, levelHeight, [
  {
    radius: approachTurn,
    angle: Math.PI / 2,
  },
  {length: approachStraight},
]), stripWidth, {cornice: false})
/** The arch through the screen wall, as wide and as high as the approach’s vault, and so are the arches of the Forge’s vestibule. */
export const climbArch = {
  width: stripWidth,
  height: levelHeight,
  profile: 'arch',
} as const
/** The screen wall across the end of the run north, which closes its broad vault and opens into the narrow approach through an arch in its middle. */
export const climbScreen: Wall = {
  id: 'bastion-climb_screen',
  room: 'bastion',
  center: [eastLegX, forgeFloorY, screenZ],
  // Facing south, back down the run.
  rotation: 0,
  width,
  height: levelHeight - 0.3,
  sticky: false,
  trimStyle: 'plain',
  cornice: false,
  holes: [
    {
      ...climbArch,
      name: 'approach',
      u: 0,
    },
  ],
}
/** The Bastion’s western passages from the Oculus to the Forge, each continuing where the one before it ends. */
export const climbPassages = [climbMouth, climbHairpin, climbRun, climbApproach] as const

/** how far along the hairpin the apex of its turn lies, halfway round it */
const apex = legLength + Math.PI * turnRadius / 2
/** the apex of the hairpin’s turn, halfway up its climb, where the map cuts the Bastion in two: from there on to the Forge, it shows the climb on the upper floor */
export const climbApex = route.at(apex)
/**
 * Which of the mouth’s evenly spaced lanterns it keeps, in mount order from its start, see CoveredPassage: the second and the fourth of the four along its run west, which hang under the Forge and before the elbow, and none in its elbow’s span.
 */
export const climbPassageLanterns = {
  mouth: [false, true, false, true, false],
} as const satisfies Record<string, ReadonlyArray<boolean>>
/** How far along the hairpin its lanterns hang, each between two ribs: halfway up the west leg, round the apex of the turn and halfway up the east leg. */
export const climbLanterns = {
  west: climbHairpin.ribGap(legLength / 2),
  turn: climbHairpin.ribGap(apex),
  east: climbHairpin.ribGap(route.length - legLength / 2),
} as const
/** How far along the run its lantern hangs, between two ribs halfway along it, over the Lodge’s roof. */
export const climbRunLantern = climbRun.ribGap(climbRun.route.length / 2)
/** How far along the approach its lantern hangs, between its last two ribs, on its straight stretch right before the vestibule’s arch. */
export const climbApproachLantern = climbApproach.ribGap(climbApproach.route.length - 0.5)
