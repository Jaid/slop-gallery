import type {RoomCamera} from '../base/Room.ts'

export default {
  overview: {
    position: [-4.87, 4.71, -19.34],
    aim: {
      yaw: -2.62,
      pitch: -0.13,
    },
    fov: 50,
    ratio: 16 / 9,
  },
  floor: {
    position: [-6.13, 0.9, 19.29],
    aim: {
      yaw: -0.46,
      pitch: 0.05,
    },
    fov: 75,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
