import type {Vec3} from './types.ts'

import {bastionMouth, bastionPassages} from './bastion.ts'
import {fortressLinkStart, fortressLinkStripZ, fortressLinkWidth, fortressPassages} from './fortress.ts'
import PassageRoute from './passages/PassageRoute.ts'
import RoutedPassage from './passages/RoutedPassage.ts'
import vaultOpening from './passages/vaultOpening.ts'

const {point: [startX, startZ], heading, y, height} = fortressLinkStart
const mouthNorthZ = bastionMouth.path[0][1] - bastionMouth.width / 2
/** the radius of the corner from the run south along the Oculus into the strip south of the Lodge */
const cornerRadius = 4
/** the radius of the last turn, from the strip south into the mouth’s north wall at its elbow */
const lastRadius = mouthNorthZ - fortressLinkStripZ
/** where the tunnel ends in the mouth’s north wall: its west wall in line with the mouth’s west wall, so it runs on into the elbow */
const endX = bastionMouth.path[1][0] - bastionMouth.width / 2 + fortressLinkWidth / 2
/**
 * The connecting tunnel from the landing south of the curve’s S bend south along the Oculus, round a corner west into the strip south of the Lodge and along it, then round a last turn south into the mouth’s elbow, easing up from the platform’s level to the mouth’s all the way.
 */
const route = new PassageRoute([startX, startZ], heading, y, height, [
  {
    y: bastionMouth.floorY,
    steps: [
      {length: fortressLinkStripZ - cornerRadius - startZ},
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
export const fortressLink = new RoutedPassage('link', 'fortress', route, fortressLinkWidth)
export const fortressLinkLanterns = [fortressLink.ribGap(4), fortressLink.ribGap(route.length - 5)]
const mouthWall = bastionMouth.walls[2]
// The tunnel opens into the mouth’s north wall at the elbow, the size of its vault and bare like the ends of the mouth’s own vaults there.
mouthWall.holes = [
  {
    ...vaultOpening(fortressLinkWidth, height),
    name: 'link',
    u: endX - mouthWall.center[0],
    casing: false,
  },
]
export const fortressNetwork = [...fortressPassages, ...bastionPassages, fortressLink]

/** All floors under a point, including the upper run where it crosses the lower passages. */
export function fortressFloors(x: number, z: number) {
  return fortressNetwork.flatMap(passage => passage.floorAt(x, z) ?? [])
}

/** Whether the position lies between any Fortress passage’s floor and vault. */
export function insideFortress(position: Vec3) {
  return fortressNetwork.some(passage => passage.contains(position))
}
