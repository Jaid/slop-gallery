import type {PlayerPose, RoomId, Vec3} from '#src/lib/gallery/types.ts'

import {knotLayout} from '#src/lib/knots/exhibition.ts'

export {insideKnotGallery as insideLevel, knotGalleryWallDistance as levelWallDistance} from '#src/lib/gallery/knotGallery.ts'

export const playerSpawn: PlayerPose = {
  position: [-knotLayout.rowHalfWidth, 0.04, knotLayout.firstRowZ + 2.75],
  yaw: 0,
  pitch: 0,
}
export const levelFloorHeight = (_position: Vec3) => 0
export const woodenFloor = (_room: RoomId, _position: Vec3) => false
