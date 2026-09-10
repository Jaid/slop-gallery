import type {PassageCutout} from './passages/Passage.ts'
import type {Vec3} from './types.ts'

import {lowerGallery, oculusPlatform} from './lowerGallery.ts'
import {oculusTower} from './oculusTower.ts'
import {Passage} from './passages/Passage.ts'

const timberWidth = 4

export const lodge = {
  center: [-25, -31],
  size: [10, 10],
  floorY: oculusPlatform.position[1] + oculusPlatform.size[1] / 2,
  height: 3.9,
  entranceX: oculusTower.x,
  // Keep both widened doorways inset from their neighboring room corners.
  returnZ: -35.6 + timberWidth / 2,
  entranceZ: lowerGallery.oculus.center[1] - lowerGallery.oculus.size[1] / 2,
  siennaZ: 8.4 + timberWidth / 2,
  // Expand the long timber passage westward, keeping its east wall fixed.
  approachX: -31.7 - timberWidth / 2,
  timberWidth,
  passageWidth: oculusTower.radius * 2,
  // Leave room for the widened stone doorway’s trim beside the north wall.
  tunnelZ: -33.6,
} as const

export const lodgeWindow = {
  roomX: lodge.center[0] - lodge.size[0] / 2,
  // The pane meets the vertical plank lining, never projecting into the passage.
  tunnelX: lodge.approachX + lodge.timberWidth / 2 - 0.09,
  z: -29.5,
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

export function insideLodgeAccess(position: Vec3) {
  const sill = lodgeWindowFloor(position[0], position[2])
  if (sill !== undefined && position[1] >= sill - 0.1 && position[1] <= lodgeWindow.top) {
    return true
  }
  return lodgeTunnel.contains(position)
}
