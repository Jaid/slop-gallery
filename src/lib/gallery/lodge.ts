import type {PlankOptions} from '../materials/PlankMaterial.ts'
import type {PassageCutout} from './passages/Passage.ts'
import type {Vec3} from './types.ts'

import lowerGallery, {oculusPlatform} from './lowerGallery.ts'
import oculusTower from './oculusTower.ts'
import Passage from './passages/Passage.ts'
import PassageTransition from './passages/PassageTransition.ts'

const timberWidth = 4
/** The Lodge lies west of the Oculus’ north end, and everything here keeps its place relative to its north wall. */
const northZ = lowerGallery.oculus.center[1] - lowerGallery.oculus.size[1] / 2 - 5
const lodge = {
  center: [-25, northZ + 5],
  size: [10, 10],
  floorY: oculusPlatform.position[1] + oculusPlatform.size[1] / 2,
  height: 3.9,
  entranceX: oculusTower.x,
  // Keep both widened doorways inset from their neighboring room corners.
  returnZ: northZ + 0.4 + timberWidth / 2,
  entranceZ: lowerGallery.oculus.center[1] - lowerGallery.oculus.size[1] / 2,
  siennaZ: 8.4 + timberWidth / 2,
  // Expand the long timber passage westward, keeping its east wall fixed.
  approachX: -31.7 - timberWidth / 2,
  timberWidth,
  passageWidth: oculusTower.radius * 2,
  // The widened stone doorway sits beside the north wall: its jamb stays 2 cm in front of the north baseboard’s cap (25 cm from the
  // wall) and 7 cm in front of its face (20 cm), and its casing still tucks into the north wall’s logs (10.5 cm). On the baseboard’s
  // face, the jamb shared that plane and flickered.
  tunnelZ: northZ + 0.27 + oculusTower.radius,
} as const

export const lodgeWindow = {
  roomX: lodge.center[0] - lodge.size[0] / 2,
  // The pane meets the vertical plank lining, never projecting into the passage.
  tunnelX: lodge.approachX + lodge.timberWidth / 2 - 0.09,
  z: northZ + 6.5,
  width: 2.4,
  bottom: lodge.floorY + 1.35,
  top: lodge.floorY + 2.65,
  lining: 0.1,
  glassThickness: 0.04,
} as const
export const lodgeWindowCutout: PassageCutout = {
  position: [(lodgeWindow.roomX + lodge.approachX) / 2, (lodgeWindow.bottom + lodgeWindow.top) / 2, lodgeWindow.z],
  size: [lodgeWindow.roomX - lodge.approachX + 0.04, lodgeWindow.top - lodgeWindow.bottom + lodgeWindow.lining * 2, lodgeWindow.width + lodgeWindow.lining * 2],
}

// Clear the two post remnants below the sill without cutting the plank backing or wall.
export const lodgeWindowRibCutouts: ReadonlyArray<PassageCutout> = [
  {
    position: [lodgeWindowCutout.position[0], (lodge.floorY - 0.3 + lodgeWindow.bottom) / 2, lodgeWindow.z],
    size: [lodgeWindowCutout.size[0], lodgeWindow.bottom - lodge.floorY + 0.3, lodgeWindowCutout.size[2]],
  },
]

export function lodgeWindowGlassDistance(origin: Vec3, direction: Vec3) {
  if (Math.abs(direction[0]) < 1e-9) {
    return
  }
  const x = lodgeWindow.tunnelX + (direction[0] < 0 ? lodgeWindow.glassThickness : 0)
  const distance = (x - origin[0]) / direction[0]
  const y = origin[1] + distance * direction[1]
  const z = origin[2] + distance * direction[2]
  if (distance >= 0 && y >= lodgeWindow.bottom && y <= lodgeWindow.top && Math.abs(z - lodgeWindow.z) <= lodgeWindow.width / 2) {
    return distance
  }
}

export function lodgeWindowFloor(x: number, z: number) {
  return x >= lodgeWindow.tunnelX && x <= lodgeWindow.roomX && Math.abs(z - lodgeWindow.z) <= lodgeWindow.width / 2 ? lodgeWindow.bottom : undefined
}

export const lodgeTunnel = new Passage('lodge-tunnel', 'lodge', [[lodge.entranceX, lodge.entranceZ], [lodge.entranceX, lodge.tunnelZ], [-20, lodge.tunnelZ]], lodge.floorY, lodge.passageWidth)
export const lodgeTunnelWalls = lodgeTunnel.walls
/** The tunnel’s last meter trades the castle stone for the Lodge’s timber, instead of switching at the doorway. */
export const lodgeTunnelTransition = new PassageTransition(lodgeTunnel)
/**
 * The Lodge’s wide-plank oak floor. It is mapped in world space, so the tunnel’s timber transition continues its boards and joints.
 *
 * The boards run east–west, along the last span of the tunnel and straight into the room.
 */
export const lodgeFloorPlanks = {
  axis: 'x',
  width: 0.17,
  length: [1.6, 3.4],
  knots: 0.3,
  bevel: 0.004,
  seam: 0.0024,
  seed: 3,
  roughness: 0.62,
  envMapIntensity: 0.25,
  colors: {
    dark: '#5a3a22',
    light: '#8e6239',
    ring: '#3a2312',
    seam: '#1a0f08',
  },
} as const satisfies PlankOptions

export function insideLodgeAccess(position: Vec3) {
  const sill = lodgeWindowFloor(position[0], position[2])
  if (sill !== undefined && position[1] >= sill - 0.1 && position[1] <= lodgeWindow.top) {
    return true
  }
  return lodgeTunnel.contains(position)
}

export default lodge
