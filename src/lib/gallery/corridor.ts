import type {FloorRectangle} from './floors.ts'
import type {Vec3} from './types.ts'

import {cutFloorOpening} from './floorPolygons.ts'
import lodge, {lodgeBay, lodgeWindowCutout} from './lodge.ts'
import Passage from './passages/Passage.ts'
import {passageRibs} from './passages/timberLayout.ts'
import StairFlight, {stairHeadroom} from './stairs/StairFlight.ts'
import StairRunner from './stairs/StairRunner.ts'

const half = lodge.timberWidth / 2
const lodgeWestX = lodge.center[0] - lodge.size[0] / 2
/** how far the Corridor’s walls keep off the Lodge’s, all the way round its bay: as far as its hall runs from the Lodge’s west wall */
const clearance = lodgeWestX - (lodge.approachX + half)
const [[, northZ], [, backZ]] = lodgeBay.corners
/** where the Corridor leaves the Lodge: through the middle of its bay’s back wall */
const doorwayX = lodge.center[0]
/** the center line of the run west along the bay’s back wall */
const runZ = backZ - clearance - half
/** the sum of x and z along the center line of the diagonal parallel to the bay’s north-west wall, whose points share theirs */
const diagonal = lodgeWestX + northZ - (clearance + half) * Math.SQRT2
/** where the diagonal hands over to the long hall south */
const hallNorthZ = diagonal - lodge.approachX
/** The long hall south from the diagonal round the Lodge’s bay to the turn toward the Sienna, which the Corridor is laid out around. */
const corridor = {
  center: [lodge.approachX, (hallNorthZ + lodge.siennaZ) / 2],
  size: [lodge.timberWidth, lodge.siennaZ - hallNorthZ],
  floorY: lodge.floorY,
  height: 3.4,
} as const

/**
 * From the doorway in the middle of the Lodge’s bay north, west along the bay’s back wall and diagonally along its north-west wall round to the long hall, which runs south past the Lodge’s window, then east to the stair flight up to the Sienna. Its walls keep the same distance from the Lodge’s all the way round.
 */
export const corridorPassage = new Passage('corridor', 'corridor', [[doorwayX, backZ], [doorwayX, runZ], [diagonal - runZ, runZ], [lodge.approachX, hallNorthZ], [lodge.approachX, lodge.siennaZ], [-31, lodge.siennaZ]], lodge.floorY, lodge.timberWidth, corridor.height, [lodgeWindowCutout])
/** The doorway passage from the Lodge’s bay north to the run along it, `from` to `to` meters out of the bay, as a rectangle across the passage. */
const doorwayPassage = (from: number, to: number): FloorRectangle => ({
  center: [doorwayX, backZ - (from + to) / 2],
  size: [lodge.timberWidth, to - from],
})
/** Where the Corridor ends toward the Lodge: halfway through the doorway passage between them, as far north of the bay’s back wall as the walls of the run along it. */
export const corridorEndZ = backZ - corridorPassage.spans[0].to / 2
/** The Lodge’s half of the doorway passage from the Corridor, laid with the Lodge’s planks to mark it. */
export const lodgeThreshold = doorwayPassage(0, backZ - corridorEndZ)
/** The Corridor’s board floor, without the Lodge’s threshold; collision still uses the full floors. */
export const corridorPaving = corridorPassage.floors.flatMap(floor => cutFloorOpening(floor, lodgeThreshold))
const jointRib = passageRibs(corridorPassage, 0).find(([start, end]) => backZ - end <= corridorEndZ && corridorEndZ <= backZ - start)!
/** The timber saddle where the Lodge’s planks meet the Corridor’s boards: across the doorway passage, under the rib that stands over that joint and as deep as the rib. */
export const lodgeThresholdSaddle = doorwayPassage(...jointRib)
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
