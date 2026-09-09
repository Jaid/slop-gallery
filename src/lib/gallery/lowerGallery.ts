import type {Vec3} from './types.ts'

import {daydream} from './daydream.ts'
import {floorThickness, subtractFloorOpening} from './floors.ts'

export const lowerGallery = {
  floorY: -8,
  undertone: {
    center: [0, 11.5],
    size: [12, 14],
    previousCenter: [18, 15],
    previousFloorY: -3.6,
  },
  glasswell: {
    center: [daydream.opening.center[0], daydream.opening.center[1] - 2.5],
    size: [18, 17],
    ceiling: {
      topY: -floorThickness,
      thickness: 0.18,
    },
  },
  tunnel: {
    x: 0,
    northZ: daydream.opening.center[1] + 6,
    southZ: 4.5,
    width: 4.2,
    height: 3.6,
  },
} as const

export const glasswellCeiling = subtractFloorOpening({
  center: [0, 0],
  size: lowerGallery.glasswell.size,
}, {
  center: [daydream.opening.center[0] - lowerGallery.glasswell.center[0], daydream.opening.center[1] - lowerGallery.glasswell.center[1]],
  size: daydream.opening.size,
})

export const glasswellPlatform: {position: Vec3
  size: Vec3} = {
  position: [lowerGallery.glasswell.center[0], lowerGallery.floorY + 1.5, lowerGallery.glasswell.center[1] - lowerGallery.glasswell.size[1] / 2 + 2.5],
  size: [lowerGallery.glasswell.size[0], 3, 5],
}

export const glasswellRamps = (['west', 'east'] as const).map(side => ({
  side,
  x: lowerGallery.glasswell.center[0] + (side === 'west' ? -1 : 1) * (lowerGallery.glasswell.size[0] / 2 - 1.1),
  startZ: glasswellPlatform.position[2] + glasswellPlatform.size[2] / 2 + 9,
  floorY: lowerGallery.floorY,
  width: 2.2,
  rise: glasswellPlatform.size[1],
  run: 9,
  railHeight: 1,
}))

export type GlasswellRampLayout = (typeof glasswellRamps)[number]

export function rampFloorHeight(x: number, z: number) {
  const ramp = glasswellRamps.find(value => Math.abs(x - value.x) <= value.width / 2 && z <= value.startZ && z >= value.startZ - value.run)
  if (!ramp) {
    return
  }
  return ramp.floorY + (ramp.startZ - z) / ramp.run * ramp.rise
}
