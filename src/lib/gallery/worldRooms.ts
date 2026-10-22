import type {WorldBox, WorldRoom} from '../webmcp/analyzeWorld.ts'
import type {FloorRectangle} from './floors.ts'

import corridor, {corridorHallEastX, corridorStairs, lodgeThreshold} from './corridor.ts'
import lodge from './lodge.ts'
import {craterTerrain} from './moonfall/CraterTerrain.ts'
import {stairHeadroom} from './stairs/StairFlight.ts'
import {roomClearHeight, rooms} from './walls.ts'

const round = (value: number) => Math.round(value * 1e4) / 1e4 + 0
/** the box over a floor rectangle, from its floor up to the given height */
const box = ({center: [x, z], size: [width, depth]}: FloorRectangle, floorY: number, height: number): WorldBox => ({
  min: [round(x - width / 2), round(floorY), round(z - depth / 2)],
  max: [round(x + width / 2), round(floorY + height), round(z + depth / 2)],
})
const hallWestX = lodge.approachX - lodge.timberWidth / 2
const hallNorthZ = lodge.returnZ - lodge.timberWidth / 2
const hallSouthZ = lodge.siennaZ + lodge.timberWidth / 2
const stairXs = corridorStairs.blocks.flatMap(block => [block.position[0] - block.size[0] / 2, block.position[0] + block.size[0] / 2])
const corridorFence = [
  box({
    center: [(hallWestX + corridorHallEastX) / 2, (hallNorthZ + hallSouthZ) / 2],
    size: [corridorHallEastX - hallWestX, hallSouthZ - hallNorthZ],
  }, corridor.floorY, corridor.height),
  // The stair flight climbs from the hall’s south end to the Sienna’s doorway.
  box({
    center: [(Math.min(...stairXs) + Math.max(...stairXs)) / 2, lodge.siennaZ],
    size: [Math.max(...stairXs) - Math.min(...stairXs), corridorStairs.width],
  }, corridorStairs.end[1], corridorStairs.start[1] + stairHeadroom - corridorStairs.end[1]),
]

/**
 * Every room of the gallery fenced by 3D boxes from its floor to its clear height, up to the vault crown in the Lobby. All rooms are one box except the Corridor,
 * its hall and the stair flight up to the Sienna, and the Lodge, which adds its threshold: its half of the doorway passage from the Corridor’s hall. The Moonfall’s box reaches
 * down to the bottom of its crater.
 */
export const worldRooms: ReadonlyArray<WorldRoom> = rooms.map(room => {
  // The Moonfall’s fence reaches down to the deepest air in its crater.
  const bottom = room.id === 'moonfall' ? room.floorY + craterTerrain.lowest() : room.floorY
  const own = box(room, bottom, roomClearHeight(room) + room.floorY - bottom)
  return {
    id: room.id,
    title: room.title,
    fence: room.id === 'corridor' ? corridorFence : (room.id === 'lodge' ? [own, box(lodgeThreshold, corridor.floorY, corridor.height)] : own),
  }
})
