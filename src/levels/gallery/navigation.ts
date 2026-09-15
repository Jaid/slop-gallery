import type {PlayerPose, RoomId, Vec3} from '#src/lib/gallery/types.ts'

import {lodgeTunnel} from '#src/lib/gallery/lodge.ts'

export {insideGallery as insideLevel, floorHeight as levelFloorHeight, wallDistance as levelWallDistance} from '#src/lib/gallery/walls.ts'

export const playerSpawn: PlayerPose = {
  position: [0.06505674123764038, 0.01948930136859417, -25.913022994995117],
  yaw: 3.135849777946853,
  pitch: -0.108,
}
export const woodenFloor = (room: RoomId, position: Vec3) => ['vesper', 'sienna', 'corridor'].includes(room) || room === 'lodge' && !lodgeTunnel.contains(position)
