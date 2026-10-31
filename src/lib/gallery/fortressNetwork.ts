import type {Wall} from '../placement/wallGeometry.ts'
import type {Vec3} from './types.ts'

import {vaultShellThickness, wallFace} from './architectureDimensions.ts'
import {bastionMouth, bastionPassages} from './bastion.ts'
import {fortressLinkStart, fortressPassages} from './fortress.ts'
import lodge from './lodge.ts'
import PassageRoute from './passages/PassageRoute.ts'
import RoutedPassage from './passages/RoutedPassage.ts'

const {point, heading, y} = fortressLinkStart
/** as high as the mouth it ends in, all along */
const {height} = bastionMouth
/** how wide the doorway passage through the west bend’s outer wall is, as wide as its doorway there fits */
const doorwayWidth = 2.2
/** how far inside the bend’s outer wall the doorway passage starts, so its walls reach that wall’s center line beside the doorway */
const neck = 0.25
/** the radius of the doorway passage’s turn south behind the doorway */
const doorwayTurnRadius = 3
/** how far the tunnel keeps off the faces and backs of its neighbors’ walls and vaults */
const gap = 0.01
const lodgeSouthZ = lodge.center[1] + lodge.size[1] / 2
const mouthNorthZ = bastionMouth.path[0][1] - bastionMouth.width / 2
/**
 * Along the strip between the Lodge and the mouth of the western climb, the tunnel takes up all the room there is: the back of its vault stays behind the face of the Lodge’s south wall, and the faces of its walls stay in front of the back of the mouth’s vault.
 * That stands as far out behind the mouth’s north wall as the tunnel’s own behind its walls, so the back of the tunnel’s vault on that side also stays behind the face of the mouth’s wall.
 */
const northZ = lodgeSouthZ - wallFace + vaultShellThickness + gap
const southZ = mouthNorthZ + wallFace - vaultShellThickness - gap
const width = southZ - northZ
const stripZ = (northZ + southZ) / 2
/** the radius of the corner from the run south along the Oculus into the strip */
const cornerRadius = 4
/** the radius of the last turn, from the strip south into the mouth’s north wall at its elbow */
const lastRadius = mouthNorthZ - stripZ
/** where the tunnel ends in the mouth’s north wall: its west wall in line with the mouth’s west wall, so it runs on into the elbow */
const endX = bastionMouth.path[1][0] - bastionMouth.width / 2 + width / 2
/**
 * The opening through a wall across the end of a stone-vaulted passage `passageWidth` wide between its walls’ center lines and `crown` high: between its walls’ faces and up under its barrel, which springs behind them, so the passage runs on through the wall without a step.
 */
const vaultSection = (passageWidth: number, crown: number) => {
  const radius = passageWidth / 2
  const half = radius - wallFace
  return {
    width: half * 2,
    height: crown,
    // as high as the barrel rises over the faces
    rise: radius - Math.sqrt(radius ** 2 - half ** 2),
    profile: 'arch',
  } as const
}
/** From the doorway in the west bend’s outer wall, level with it, round a short turn to the south. */
const doorwayRoute = new PassageRoute([point[0] - Math.cos(heading) * neck, point[1] - Math.sin(heading) * neck], heading, y, height, [
  {length: neck},
  {
    radius: doorwayTurnRadius,
    angle: Math.PI / 2 - heading,
  },
])
// Its vault is too narrow to hide its walls’ cornices, which would stand out into the arch at its end.
export const fortressLinkDoorway = new RoutedPassage('link_doorway', 'fortress', doorwayRoute, doorwayWidth, {cornice: false})
const [startX, startZ] = doorwayRoute.end.point
/**
 * The broad tunnel from behind the doorway passage south along the Oculus, round a corner west into the strip south of the Lodge and along it, then round a last turn south into the mouth’s elbow, easing up from the platform’s level to the mouth’s all the way.
 */
const route = new PassageRoute([startX, startZ], Math.PI / 2, y, height, [
  {
    y: bastionMouth.floorY,
    steps: [
      {length: stripZ - cornerRadius - startZ},
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
export const fortressLink = new RoutedPassage('link', 'fortress', route, width)
export const fortressLinkLanterns = [fortressLink.ribGap(4), fortressLink.ribGap(route.length - 5)]
/**
 * The wall across the start of the broad tunnel, behind the doorway passage, which opens into it through a bare arch the size of that passage’s vault.
 * Untrimmed, so the baseboards of the tunnel’s walls run on into it instead of meeting its own in its corners.
 */
export const fortressLinkScreen: Wall = {
  id: 'fortress-link_screen',
  room: 'fortress',
  center: [startX, y, startZ],
  // Facing south, down the tunnel.
  rotation: 0,
  width,
  height: height - 0.3,
  sticky: false,
  trimStyle: 'none',
  holes: [
    {
      ...vaultSection(doorwayWidth, height),
      name: 'doorway',
      u: 0,
    },
  ],
}
const mouthWall = bastionMouth.walls[2]
// The tunnel opens into the mouth’s north wall at the elbow, the size of its vault and bare like the ends of the mouth’s own vaults there.
mouthWall.holes = [
  {
    ...vaultSection(width, height),
    name: 'link',
    u: endX - mouthWall.center[0],
    casing: false,
  },
]
/** The doorway passage and the broad tunnel behind it, which join the Fortress’ curve to the mouth of its western climb. */
export const fortressLinkPassages = [fortressLinkDoorway, fortressLink] as const
export const fortressNetwork = [...fortressPassages, ...bastionPassages, ...fortressLinkPassages]

/** All floors under a point, including the upper run where it crosses the lower passages. */
export function fortressFloors(x: number, z: number) {
  return fortressNetwork.flatMap(passage => passage.floorAt(x, z) ?? [])
}

/** Whether the position lies between any Fortress passage’s floor and vault. */
export function insideFortress(position: Vec3) {
  return fortressNetwork.some(passage => passage.contains(position))
}
