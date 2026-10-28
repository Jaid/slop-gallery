import type {RoomCamera} from '../base/Room.ts'

export default {
  overview: {
    position: [-2.646, 2.856, -7.442],
    aim: {
      yaw: -3.0385,
      pitch: -0.2872,
    },
    fov: 80,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
