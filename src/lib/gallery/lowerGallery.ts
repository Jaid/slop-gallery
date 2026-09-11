import type {Vec3} from './types.ts'

import {floorThickness, subtractFloorOpening} from './floors.ts'
import lobby from './lobby.ts'

const lowerGallery = {
  floorY: -8,
  moonfall: {
    // Keep the north tunnel and east stair landing fixed; expand west and south.
    center: [-8, 18.5],
    size: [28, 28],
  },
  oculus: {
    center: [lobby.opening.center[0], lobby.opening.center[1] - 2.5],
    size: [18, 17],
    ceiling: {
      topY: -floorThickness,
      thickness: 0.18,
    },
  },
  tunnel: {
    x: 0,
    northZ: lobby.opening.center[1] + 6,
    southZ: 4.5,
    width: 4.2,
    height: 3.6,
  },
} as const

export const oculusCeiling = subtractFloorOpening({
  center: [0, 0],
  size: lowerGallery.oculus.size,
}, {
  center: [lobby.opening.center[0] - lowerGallery.oculus.center[0], lobby.opening.center[1] - lowerGallery.oculus.center[1]],
  size: lobby.opening.size,
})

export const oculusPlatform: {position: Vec3
  size: Vec3} = {
  position: [lowerGallery.oculus.center[0], lowerGallery.floorY + 1.5, lowerGallery.oculus.center[1] - lowerGallery.oculus.size[1] / 2 + 2.5],
  size: [lowerGallery.oculus.size[0], 3, 5],
}

export const oculusRamps = (['west', 'east'] as const).map(side => ({
  side,
  x: lowerGallery.oculus.center[0] + (side === 'west' ? -1 : 1) * (lowerGallery.oculus.size[0] / 2 - 1.1),
  startZ: oculusPlatform.position[2] + oculusPlatform.size[2] / 2 + 9,
  floorY: lowerGallery.floorY,
  width: 2.2,
  rise: oculusPlatform.size[1],
  run: 9,
  railHeight: 1,
}))

export type OculusRampLayout = (typeof oculusRamps)[number]

export function rampFloorHeight(x: number, z: number) {
  const ramp = oculusRamps.find(value => Math.abs(x - value.x) <= value.width / 2 && z <= value.startZ && z >= value.startZ - value.run)
  if (!ramp) {
    return
  }
  return ramp.floorY + (ramp.startZ - z) / ramp.run * ramp.rise
}

export default lowerGallery
