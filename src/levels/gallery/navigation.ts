import type {PlayerPose, RoomId, Vec3} from '#src/lib/gallery/types.ts'

import {lodgeTunnel} from '#src/lib/gallery/lodge.ts'

export {insideGallery as insideLevel, floorHeight as levelFloorHeight} from '#src/lib/gallery/walls.ts'

export const playerSpawn: PlayerPose = {
  position: [0.065_056_741_237_640_38, 0.019_489_301_368_594_17, -25.913_022_994_995_117],
  yaw: 3.135_849_777_946_853,
  pitch: -0.108,
}
export const woodenFloor = (room: RoomId, position: Vec3) => ['vesper', 'sienna', 'corridor'].includes(room) || room === 'lodge' && !lodgeTunnel.contains(position)
