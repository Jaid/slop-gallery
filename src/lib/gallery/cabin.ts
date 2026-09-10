import type {PassageCutout} from './passages/Passage.ts'
import type {Vec3} from './types.ts'

import {glasswellTower} from './glasswellTower.ts'
import {glasswellPlatform, lowerGallery} from './lowerGallery.ts'
import {Passage} from './passages/Passage.ts'
import {StairFlight, stairHeadroom} from './stairs/StairFlight.ts'

const timberWidth = 4

export const cabin = {
  center: [-25, -31],
  size: [10, 10],
  floorY: glasswellPlatform.position[1] + glasswellPlatform.size[1] / 2,
  height: 3.9,
  entranceX: glasswellTower.x,
  // Keep both widened doorways inset from their neighboring room corners.
  returnZ: -35.6 + timberWidth / 2,
  entranceZ: lowerGallery.glasswell.center[1] - lowerGallery.glasswell.size[1] / 2,
  amberZ: 8.4 + timberWidth / 2,
  // Expand the long timber passage westward, keeping its east wall fixed.
  approachX: -31.7 - timberWidth / 2,
  timberWidth,
  passageWidth: glasswellTower.radius * 2,
  // Leave room for the widened stone doorway’s trim beside the north wall.
  tunnelZ: -33.6,
} as const

export const cabinWindow = {
  roomX: cabin.center[0] - cabin.size[0] / 2,
  // The pane meets the vertical plank lining, never projecting into the passage.
  tunnelX: cabin.approachX + cabin.timberWidth / 2 - 0.09,
  z: -29.5,
  width: 2.4,
  bottom: cabin.floorY + 1.35,
  top: cabin.floorY + 2.65,
  lining: 0.1,
  glassThickness: 0.04,
} as const
export const cabinWindowCutout: PassageCutout = {
  position: [(cabinWindow.roomX + cabin.approachX) / 2, (cabinWindow.bottom + cabinWindow.top) / 2, cabinWindow.z],
  size: [cabinWindow.roomX - cabin.approachX + 0.04, cabinWindow.top - cabinWindow.bottom + cabinWindow.lining * 2, cabinWindow.width + cabinWindow.lining * 2],
}

// Clear the two post remnants below the sill without cutting the plank backing or wall.
export const cabinWindowRibCutouts: ReadonlyArray<PassageCutout> = [
  {
    position: [cabinWindowCutout.position[0], (cabin.floorY - 0.3 + cabinWindow.bottom) / 2, cabinWindow.z],
    size: [cabinWindowCutout.size[0], cabinWindow.bottom - cabin.floorY + 0.3, cabinWindowCutout.size[2]],
  },
]

export function cabinWindowGlassDistance(origin: Vec3, direction: Vec3) {
  if (Math.abs(direction[0]) < 1e-9) {
    return
  }
  const x = cabinWindow.tunnelX + (direction[0] < 0 ? cabinWindow.glassThickness : 0)
  const distance = (x - origin[0]) / direction[0]
  const y = origin[1] + distance * direction[1]
  const z = origin[2] + distance * direction[2]
  if (distance >= 0 && y >= cabinWindow.bottom && y <= cabinWindow.top && Math.abs(z - cabinWindow.z) <= cabinWindow.width / 2) {
    return distance
  }
}

export function cabinWindowFloor(x: number, z: number) {
  return x >= cabinWindow.tunnelX && x <= cabinWindow.roomX && Math.abs(z - cabinWindow.z) <= cabinWindow.width / 2 ? cabinWindow.bottom : undefined
}

export const cabinTunnel = new Passage('cabin-tunnel', 'cabin', [[cabin.entranceX, cabin.entranceZ], [cabin.entranceX, cabin.tunnelZ], [-20, cabin.tunnelZ]], cabin.floorY, cabin.passageWidth)
export const cabinApproach = new Passage('cabin-approach', 'cabin', [[-30, cabin.returnZ], [cabin.approachX, cabin.returnZ], [cabin.approachX, cabin.amberZ], [-31, cabin.amberZ]], cabin.floorY, cabin.timberWidth, 3.4, [cabinWindowCutout])
export const cabinPassages = [cabinTunnel, cabinApproach]
// The first tread begins at Amber’s west doorway, without an intervening corridor.
export const cabinStairs = new StairFlight('return', [-20, 0, cabin.amberZ], [-31, cabin.floorY, cabin.amberZ], cabin.timberWidth, 28, 0, 0.35, 'cabin')
export const cabinRails = [-1, 1].map(side => cabinStairs.beam(1, 0.065, 0.065, cabin.amberZ + side * (cabinStairs.width / 2 - 0.23)))
export const cabinRouteWalls = [
  ...cabinTunnel.walls, ...[...cabinApproach.walls, ...[-1, 1].map(side => cabinStairs.wall(side))].map(wall => ({
    ...wall,
    trimStyle: 'none' as const,
  })),
]

export function cabinStairFloor(x: number, z: number) {
  return cabinStairs.blocks.find(block => Math.abs(x - block.position[0]) <= block.size[0] / 2 + 1e-6 && Math.abs(z - block.position[2]) <= block.size[2] / 2 + 1e-6)?.top
}

export function insideCabinRoute(position: Vec3) {
  const sill = cabinWindowFloor(position[0], position[2])
  if (sill !== undefined && position[1] >= sill - 0.1 && position[1] <= cabinWindow.top) {
    return true
  }
  const floor = cabinStairFloor(position[0], position[2])
  return cabinPassages.some(passage => passage.contains(position)) || floor !== undefined && position[1] >= floor - 1 && position[1] <= floor + stairHeadroom
}
