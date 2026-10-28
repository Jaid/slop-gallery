import type {FloorRectangle} from './floors.ts'
import type {Vec3} from './types.ts'

import lodge, {lodgeWindowCutout} from './lodge.ts'
import Passage from './passages/Passage.ts'
import {passageRibs} from './passages/timberLayout.ts'
import StairFlight, {stairHeadroom} from './stairs/StairFlight.ts'
import StairRunner from './stairs/StairRunner.ts'

const corridor = {
  center: [lodge.approachX, (lodge.returnZ + lodge.siennaZ) / 2],
  size: [lodge.timberWidth, lodge.siennaZ - lodge.returnZ],
  floorY: lodge.floorY,
  height: 3.4,
} as const
const lodgeWestX = lodge.center[0] - lodge.size[0] / 2
/** Where the Corridor’s hall ends toward the Lodge: halfway through the doorway passage between them. */
export const corridorHallEastX = (lodge.approachX + lodge.timberWidth / 2 + lodgeWestX) / 2
/** The Lodge’s half of the doorway passage from the Corridor’s hall, laid with the Lodge’s planks to mark it. */
export const lodgeThreshold: FloorRectangle = {
  center: [(corridorHallEastX + lodgeWestX) / 2, lodge.returnZ],
  size: [lodgeWestX - corridorHallEastX, lodge.timberWidth],
}

export const corridorPassage = new Passage('corridor', 'corridor', [[-30, lodge.returnZ], [lodge.approachX, lodge.returnZ], [lodge.approachX, lodge.siennaZ], [-31, lodge.siennaZ]], lodge.floorY, lodge.timberWidth, corridor.height, [lodgeWindowCutout])
// The doorway passage leaves the Lodge westward, so its ribs lie that far west of the Lodge’s wall.
const doorwayX = corridorPassage.spans[0].start[0]
const jointRib = passageRibs(corridorPassage, 0).find(([start, end]) => doorwayX - end <= corridorHallEastX && corridorHallEastX <= doorwayX - start)!
/** The timber saddle where the Lodge’s planks meet the Corridor’s boards: across the doorway passage, under the rib that stands over that joint and as deep as the rib. */
export const lodgeThresholdSaddle: FloorRectangle = {
  center: [doorwayX - (jointRib[0] + jointRib[1]) / 2, lodge.returnZ],
  size: [jointRib[1] - jointRib[0], corridorPassage.width],
}
// The first tread begins at Sienna’s west doorway, without an intervening landing.
export const corridorStairs = new StairFlight('return', [-20, 0, lodge.siennaZ], [-31, lodge.floorY, lodge.siennaZ], lodge.timberWidth, 28, 0, 0.35, 'corridor')
// A 2.4 m runner leaves wide oak margins and clears both handrails’ posts.
export const corridorRunner = new StairRunner(corridorStairs, 2.4)
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
