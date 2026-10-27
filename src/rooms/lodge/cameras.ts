import type {RoomCamera} from '../base/Room.ts'

export default {
  overview: {
    position: [4.39, 2.97, -2.53],
    aim: {
      yaw: 2.24,
      pitch: -0.33,
    },
    fov: 65,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
