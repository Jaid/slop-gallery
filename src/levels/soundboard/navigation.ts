import type {PlayerPose, RoomId, Vec3} from '#src/lib/gallery/types.ts'

import {soundboardBounds, soundboardGroundStripes, soundboardGroundSurface} from '#src/lib/audio/soundboard.ts'

export const playerSpawn: PlayerPose = {
  position: [soundboardGroundStripes[0].centerX, 0.04, soundboardBounds.southZ - 3.2],
  yaw: 0,
  pitch: 0,
}
/** spots that T teleports between with `?development`, see `src/lib/gallery/bookmarks.ts` */
export const bookmarks: Array<PlayerPose> = []
export const levelFloorHeight = (_position: Vec3) => 0
export const groundSurface = (_room: RoomId, position: Vec3) => soundboardGroundSurface(position)

export {insideSoundboard as insideLevel, soundboardWallDistance as levelWallDistance} from '#src/lib/audio/soundboard.ts'
