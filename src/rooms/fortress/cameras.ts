import type {RoomCamera} from '../base/Room.ts'

export default {
  // In the elbow under the lantern, looking west down the vault toward the Lodge’s timber end.
  overview: {
    position: [0.6, 1.7, 0.4],
    aim: {
      yaw: Math.PI / 2,
      pitch: -0.05,
    },
    fov: 70,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
