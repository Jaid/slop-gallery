import type {PlayerPose, RoomId, Vec3} from '#src/lib/gallery/types.ts'

import lobby from '#src/lib/gallery/lobby.ts'
import {lodgeTunnel} from '#src/lib/gallery/lodge.ts'
import {moonfallCrater} from '#src/lib/gallery/moonfall/config.ts'
import {siennaRugSize} from '#src/lib/gallery/sienna.ts'
import {rooms} from '#src/lib/gallery/walls.ts'

export {insideGallery as insideLevel, floorHeight as levelFloorHeight, wallDistance as levelWallDistance} from '#src/lib/gallery/walls.ts'

export type GroundSurface = 'fabric' | 'generic' | 'glass' | 'hollow'

export const playerSpawn: PlayerPose = {
  position: [0.06505674123764038, 0.01948930136859417, -25.913022994995117],
  yaw: 3.135849777946853,
  pitch: -0.108,
}

const containsRectangle = (x: number, z: number, center: readonly [number, number], size: readonly [number, number]) => Math.abs(x - center[0]) <= size[0] / 2 + 1e-6 && Math.abs(z - center[1]) <= size[1] / 2 + 1e-6
const moonfall = rooms.find(room => room.id === 'moonfall')!
const sienna = rooms.find(room => room.id === 'sienna')!

export function groundSurface(room: RoomId, position: Vec3): GroundSurface {
  const [x, , z] = position
  if (room === 'lobby' && containsRectangle(x, z, lobby.opening.center, lobby.opening.size)) {
    return 'glass'
  }
  if (room === 'sienna' && containsRectangle(x, z, sienna.center, siennaRugSize)) {
    return 'fabric'
  }
  if (room === 'moonfall' && Math.hypot(x - moonfall.center[0], z - moonfall.center[1]) <= moonfallCrater.radius + 1e-6) {
    return 'fabric'
  }
  if (['corridor', 'sienna', 'vesper'].includes(room) || room === 'lodge' && !lodgeTunnel.contains(position)) {
    return 'hollow'
  }
  return 'generic'
}
