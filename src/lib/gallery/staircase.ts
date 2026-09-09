import type {StairBeam, StairBlock} from './stairs/StairFlight.ts'
import type {Vec3} from './types.ts'

import {lowerGallery} from './lowerGallery.ts'
import {StairFlight, stairHeadroom, stairThickness} from './stairs/StairFlight.ts'

export const staircase = {
  startX: 4,
  turnX: 14,
  endX: 6,
  z: 11.5,
  returnZ: 15.1,
  width: 2.6,
  topY: 0,
  bottomY: lowerGallery.floorY,
  landing: 0.8,
  count: 44,
} as const
export const stairFlights = [
  new StairFlight('upper', [staircase.startX, staircase.topY, staircase.z], [staircase.turnX, staircase.bottomY / 2, staircase.z], staircase.width, staircase.count / 2, staircase.landing),
  new StairFlight('lower', [staircase.turnX, staircase.bottomY / 2, staircase.returnZ], [staircase.endX, staircase.bottomY, staircase.returnZ], staircase.width, staircase.count / 2, 0, staircase.landing),
]
export const stairTurn: StairBlock = {
  position: [staircase.turnX + staircase.width / 2, staircase.bottomY / 2 - stairThickness / 2, (staircase.z + staircase.returnZ) / 2],
  size: [staircase.width, stairThickness, staircase.returnZ - staircase.z + staircase.width],
  top: staircase.bottomY / 2,
  direction: 0,
  tread: false,
}
export const stairBlocks = [...stairFlights[0]!.blocks, stairTurn, ...stairFlights[1]!.blocks]
export const stairRoofs: Array<StairBeam> = [
  ...stairFlights.map(flight => flight.beam(stairHeadroom, 0.18, staircase.width)),
  {
    position: [stairTurn.position[0], stairTurn.top + stairHeadroom, stairTurn.position[2]],
    rotation: [0, 0, 0],
    size: [stairTurn.size[0], 0.18, stairTurn.size[2]],
  },
]
export const stairRails = stairFlights.flatMap(flight => [-1, 1].map(side => flight.beam(1, 0.065, 0.065, flight.start[2] + side * (staircase.width / 2 - 0.22))))

export function stairFloorHeight(x: number, z: number) {
  return stairBlocks.find(block => Math.abs(x - block.position[0]) <= block.size[0] / 2 + 1e-9 && Math.abs(z - block.position[2]) <= block.size[2] / 2 + 1e-9)?.top
}

export function insideStairway([x, y, z]: Vec3) {
  const floor = stairFloorHeight(x, z)
  return floor !== undefined && y >= floor - 1 && y <= floor + stairHeadroom
}
