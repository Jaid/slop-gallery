import type {RoomCamera} from '../base/Room.ts'

export default {
  overview: {
    position: [5.97, 8.95, 7.72],
    aim: {
      yaw: 0.64,
      pitch: -0.3,
    },
    fov: 70,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
