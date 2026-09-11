import type {PlayerPose, RoomId, Vec3} from '#src/lib/gallery/types.ts'

import {insideSoundboard, soundboardBounds, soundboardWallDistance} from '#src/lib/audio/soundboard.ts'

export {insideSoundboard as insideLevel, soundboardWallDistance as levelWallDistance}

export const playerSpawn: PlayerPose = {
  position: [0, 0.04, Math.min(0, soundboardBounds.southZ - 3.2)],
  yaw: 0,
  pitch: 0,
}
export const levelFloorHeight = (_position: Vec3) => 0
export const woodenFloor = (_room: RoomId, _position: Vec3) => false
