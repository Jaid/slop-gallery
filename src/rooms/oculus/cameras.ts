import type {RoomCamera} from '../base/Room.ts'

export default {
  overview: {
    position: [5.97, 7.95, 7.72],
    aim: {
      yaw: 0.64,
      pitch: -0.3,
    },
    fov: 70,
    ratio: 16 / 9,
  },
  balcony: {
    position: [-6.448, 8.014, -9.632],
    aim: {
      yaw: -2.7851,
      pitch: -0.262,
    },
    fov: 55,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
