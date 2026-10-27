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
  tunnel_exhibition: {
    position: [0.08, 3.66, 28.53],
    aim: {
      yaw: 0.02,
      pitch: 0.01,
    },
    fov: 80,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
