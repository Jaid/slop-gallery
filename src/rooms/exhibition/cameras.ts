import type {RoomCamera} from '../base/Room.ts'

export default {
  // At the tunnel’s high south end, looking down its slope between the displays.
  overview: {
    position: [0.08, 2.16, 8.78],
    aim: {
      yaw: 0.02,
      pitch: 0.01,
    },
    fov: 80,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
