import type {PlayerPose, RoomId, Vec3} from '#src/lib/gallery/types.ts'

export {insideKnotGallery as insideLevel} from '#src/lib/gallery/knotGallery.ts'

export const playerSpawn: PlayerPose = {
  position: [0, 0.04, -12],
  yaw: 0,
  pitch: 0,
}
export const levelFloorHeight = (_position: Vec3) => 0
export const woodenFloor = (_room: RoomId, _position: Vec3) => false
