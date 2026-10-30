import type {RoomCamera} from '../base/Room.ts'

export default {
  // Where the curve leaves the apse’s east shoulder, looking west along its crown toward the lantern at its top.
  overview: {
    position: [8.96, 1.7, 1.79],
    aim: {
      yaw: 1.18,
      pitch: -0.05,
    },
    fov: 70,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
