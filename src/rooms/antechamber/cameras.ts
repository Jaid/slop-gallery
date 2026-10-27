import type {RoomCamera} from '../base/Room.ts'

export default {
  overview: {
    position: [-2.05, 0.67, 3.45],
    aim: {
      yaw: -0.59,
      pitch: 0.59,
    },
    fov: 85,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
