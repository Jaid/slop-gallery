import type {Vec3} from './types.ts'

import lodge, {lodgeWindowCutout} from './lodge.ts'
import Passage from './passages/Passage.ts'
import StairFlight, {stairHeadroom} from './stairs/StairFlight.ts'

const corridor = {
  center: [lodge.approachX, (lodge.returnZ + lodge.siennaZ) / 2],
  size: [lodge.timberWidth, lodge.siennaZ - lodge.returnZ],
  floorY: lodge.floorY,
  height: 3.4,
} as const

export const corridorPassage = new Passage('corridor', 'corridor', [[-30, lodge.returnZ], [lodge.approachX, lodge.returnZ], [lodge.approachX, lodge.siennaZ], [-31, lodge.siennaZ]], lodge.floorY, lodge.timberWidth, corridor.height, [lodgeWindowCutout])
// The first tread begins at Sienna’s west doorway, without an intervening landing.
export const corridorStairs = new StairFlight('return', [-20, 0, lodge.siennaZ], [-31, lodge.floorY, lodge.siennaZ], lodge.timberWidth, 28, 0, 0.35, 'corridor')
export const corridorRails = [-1, 1].map(side => corridorStairs.beam(1, 0.065, 0.065, lodge.siennaZ + side * (corridorStairs.width / 2 - 0.23)))
export const corridorWalls = [...corridorPassage.walls, ...[-1, 1].map(side => corridorStairs.wall(side))].map(wall => ({
  ...wall,
  trimStyle: 'none' as const,
}))

export function corridorStairFloor(x: number, z: number) {
  return corridorStairs.blocks.find(block => Math.abs(x - block.position[0]) <= block.size[0] / 2 + 1e-6 && Math.abs(z - block.position[2]) <= block.size[2] / 2 + 1e-6)?.top
}

export function insideCorridor(position: Vec3) {
  const floor = corridorStairFloor(position[0], position[2])
  return corridorPassage.contains(position) || floor !== undefined && position[1] >= floor - 1 && position[1] <= floor + stairHeadroom
}

export default corridor
