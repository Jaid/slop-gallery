import type {RoomCamera} from '../base/Room.ts'

export default {
  floor: {
    position: [-0.83, 0.47, -7.09],
    aim: {
      yaw: -2.8,
      pitch: 0.09,
    },
    fov: 70,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
