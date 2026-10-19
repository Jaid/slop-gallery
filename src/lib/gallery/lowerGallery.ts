import type {Vec3} from './types.ts'

import {floorThickness, subtractFloorOpening} from './floors.ts'
import lobby from './lobby.ts'

const moonfallFloorY = -8
export const oculusDrop = 3
const oculusNorthZ = lobby.opening.center[1] - 11
// Extend toward Moonfall, shortening the connection by four meters without moving the Lobby glass or Lodge entrance.
const oculusSouthZ = lobby.opening.center[1] + 10
const lowerGallery = {
  floorY: moonfallFloorY,
  moonfall: {
    // Keep the north tunnel and east stair landing fixed; expand west and south.
    center: [-8, 18.5],
    size: [28, 28],
  },
  oculus: {
    floorY: moonfallFloorY - oculusDrop,
    center: [lobby.opening.center[0], (oculusNorthZ + oculusSouthZ) / 2],
    size: [18, oculusSouthZ - oculusNorthZ],
    ceiling: {
      topY: -floorThickness,
      thickness: 0.18,
    },
  },
  tunnel: {
    x: 0,
    northZ: oculusSouthZ,
    southZ: 4.5,
    northY: moonfallFloorY - oculusDrop,
    southY: moonfallFloorY,
    width: 4.2,
    height: 3.6,
  },
} as const

export const tunnelSlope = (lowerGallery.tunnel.southY - lowerGallery.tunnel.northY) / (lowerGallery.tunnel.southZ - lowerGallery.tunnel.northZ)
/** The connection keeps plumb end faces and constant vertical headroom. */
export function tunnelFloorHeight(z: number) {
  return lowerGallery.tunnel.northY + (z - lowerGallery.tunnel.northZ) * tunnelSlope
}

export const oculusCeiling = subtractFloorOpening({
  center: [0, 0],
  size: lowerGallery.oculus.size,
}, {
  center: [lobby.opening.center[0] - lowerGallery.oculus.center[0], lobby.opening.center[1] - lowerGallery.oculus.center[1]],
  size: lobby.opening.size,
})

const platformTopY = moonfallFloorY + 3
const platformHeight = platformTopY - lowerGallery.oculus.floorY
export const oculusPlatform: {
  position: Vec3
  size: Vec3
} = {
  position: [lowerGallery.oculus.center[0], lowerGallery.oculus.floorY + platformHeight / 2, oculusNorthZ + 2.5],
  size: [lowerGallery.oculus.size[0], platformHeight, 5],
}

// The original wall-side flights keep their elevations. Parallel lower flights run in the opposite direction, turning on a full-width landing.
export const oculusRamps = (['west', 'east'] as const).map(side => ({
  side,
  x: lowerGallery.oculus.center[0] + (side === 'west' ? -1 : 1) * (lowerGallery.oculus.size[0] / 2 - 1.1),
  startZ: oculusPlatform.position[2] + oculusPlatform.size[2] / 2 + 9,
  floorY: moonfallFloorY,
  width: 2.2,
  rise: platformTopY - moonfallFloorY,
  run: 9,
  direction: -1,
  railHeight: 1,
}))
export const oculusLowerRamps = oculusRamps.map(ramp => ({
  ...ramp,
  x: ramp.x + (ramp.side === 'west' ? 1 : -1) * ramp.width,
  // Leave a ground-level approach between the lower foot and the tall north platform.
  startZ: ramp.startZ - ramp.run + 1.6,
  run: ramp.run - 1.6,
  floorY: lowerGallery.oculus.floorY,
  rise: oculusDrop,
  direction: 1,
}))
export const oculusRampFlights = [...oculusRamps, ...oculusLowerRamps]
export const oculusRampLandings = oculusRamps.map(ramp => ({
  side: ramp.side,
  position: [ramp.x + (ramp.side === 'west' ? 1 : -1) * ramp.width / 2, lowerGallery.oculus.floorY + oculusDrop / 2, ramp.startZ + ramp.width / 2] as Vec3,
  size: [ramp.width * 2, oculusDrop, ramp.width] as Vec3,
}))

export function rampFloorHeight(x: number, z: number) {
  for (const ramp of oculusRampFlights) {
    const distance = (z - ramp.startZ) * ramp.direction
    if (Math.abs(x - ramp.x) <= ramp.width / 2 && distance >= 0 && distance <= ramp.run) {
      return ramp.floorY + distance / ramp.run * ramp.rise
    }
  }
  const landing = oculusRampLandings.find(({position, size}) => Math.abs(x - position[0]) <= size[0] / 2 && Math.abs(z - position[2]) <= size[2] / 2)
  if (landing) {
    return landing.position[1] + landing.size[1] / 2
  }
}

export default lowerGallery
