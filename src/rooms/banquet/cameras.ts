import type {RoomCamera} from '../base/Room.ts'

export default {
  floor: {
    position: [-3.39, 0.58, 11.24],
    aim: {
      yaw: 0.15,
      pitch: -0.03,
    },
    fov: 50,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
