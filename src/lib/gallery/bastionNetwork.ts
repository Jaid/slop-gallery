import type {Wall, WallOpening} from '../placement/wallGeometry.ts'
import type {Vec3} from './types.ts'

import {bastionLinkStart, bastionLinkStripZ, bastionLinkWidth, bastionPassages} from './bastion.ts'
import {climbMouth, climbPassages} from './climb.ts'
import FloorHollow from './passages/FloorHollow.ts'
import PassageRoute from './passages/PassageRoute.ts'
import RoutedPassage from './passages/RoutedPassage.ts'
import vaultOpening from './passages/vaultOpening.ts'

const {point: [startX, startZ], heading, y, height} = bastionLinkStart
const mouthNorthZ = climbMouth.path[0][1] - climbMouth.width / 2
/** the radius of the corner from the run south along the Oculus into the strip south of the Lodge */
const cornerRadius = 4
/** the radius of the last turn, from the strip south into the mouth’s north wall at its elbow */
const lastRadius = mouthNorthZ - bastionLinkStripZ
/** where the tunnel ends in the mouth’s north wall: its west wall in line with the mouth’s west wall, so it runs on into the elbow, its middle where orbs roll up to it out of the hairpin */
const endX = climbMouth.path[1][0] - climbMouth.width / 2 + bastionLinkWidth / 2
/** the opening it ends in through the mouth’s north wall, the size of its vault */
const linkVault = vaultOpening(bastionLinkWidth, height)
/** where the mouth’s elbow ends in the east, open to the straight run on toward the doorway: on the line straight across from the corner of its walls inside the turn */
const elbowEastX = climbMouth.path[1][0] + climbMouth.width / 2
/**
 * The hollow the elbow’s paving has sunk into in front of the gate, between the hairpin’s foot and the tunnel, as though water had long drained off down the tunnel through the gate’s hatch: deepest just beyond the gate, under the hatch, and shallow over most of the elbow.
 * It keeps off the walls but where the tunnel opens, its west side in line with the mouth’s west wall, and widens out east as soon as it leaves the north wall, all the way to where the elbow ends, so orbs that miss the hatch roll back down to it.
 */
export const climbMouthHollow = new FloorHollow(climbMouth.floorY, {
  center: [endX, mouthNorthZ],
  half: linkVault.width / 2,
  into: [0, -1],
}, {
  depth: 0.15,
  beyond: 0.5,
  reach: 3.5,
  spread: [0, 4],
  width: [linkVault.width / 2, elbowEastX - endX],
})
/**
 * The connecting tunnel from the landing south of the curve’s S bend south along the Oculus, round a corner west into the strip south of the Lodge and along it, then round a last turn south into the mouth’s elbow, easing up from the platform’s level all the way to a step under the hollow in front of it.
 */
const route = new PassageRoute([startX, startZ], heading, y, height, [
  {
    y: climbMouthHollow.outletY,
    steps: [
      {length: bastionLinkStripZ - cornerRadius - startZ},
      {
        radius: cornerRadius,
        angle: Math.PI / 2,
      },
      {length: startX - cornerRadius - endX - lastRadius},
      {
        radius: lastRadius,
        angle: -Math.PI / 2,
      },
    ],
  },
])
export const bastionLink = new RoutedPassage('link', 'bastion', route, bastionLinkWidth)
export const bastionLinkLanterns = [bastionLink.ribGap(4), bastionLink.ribGap(route.length - 5)]
const mouthWall = climbMouth.walls[2]
/** The tunnel opens into the mouth’s north wall at the elbow, the size of its vault and bare like the ends of the mouth’s own vaults there. */
const linkHole = {
  ...linkVault,
  name: 'link',
  u: endX - mouthWall.center[0],
  casing: false,
} as const satisfies WallOpening
mouthWall.holes = [linkHole]
/** how far under the mouth’s floor the gate’s foot stands, on the tunnel’s floor, a step under the hollow */
const gateFoot = climbMouthHollow.outletY - climbMouth.floorY
/**
 * The iron gate barring the tunnel where it opens into the mouth’s elbow, barred like the apse’s gate, low over the floor and on up its bars, but for a hatch in the middle of its foot, round-headed like a mouse hole: wide enough for an orb rolling at it to slip through and on down the tunnel, far too low for anyone to follow.
 * Orbs rolling down the hairpin come out of its turn along the west leg’s west wall and roll on 0.75 m in from it, straight at the hatch across the elbow; those that miss it roll back down into the hollow in front of it.
 * It stands on the tunnel’s floor, its bars reaching down past the hollow’s edge there. In the frame of the mouth’s north wall, facing south into the elbow.
 */
export const bastionLinkGate = {
  wall: mouthWall,
  hole: {
    ...linkHole,
    bottom: gateFoot,
  },
  hatch: {
    u: endX - mouthWall.center[0],
    width: 0.6,
    bottom: gateFoot,
    height: gateFoot + 0.5,
    profile: 'arch',
  },
  bands: [0.15, 1.05, 1.95],
} as const satisfies {
  bands: ReadonlyArray<number>
  hatch: WallOpening
  hole: WallOpening
  wall: Wall
}
export const bastionNetwork = [...bastionPassages, ...climbPassages, bastionLink]

/** All floors under a point, including the upper run where it crosses the lower passages. */
export function bastionFloors(x: number, z: number) {
  return bastionNetwork.flatMap(passage => passage.floorAt(x, z) ?? [])
}

/** Whether the position lies between any Bastion passage’s floor and vault. */
export function insideBastion(position: Vec3) {
  return bastionNetwork.some(passage => passage.contains(position))
}
