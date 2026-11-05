import type {RoomCamera} from '../base/Room.ts'

export default {
  // Where the curve leaves the apse’s east shoulder, looking west along its crown past the barred gate toward the lanterns.
  overview: {
    position: [6.2, 1.7, -0.1],
    aim: {
      yaw: 1.66,
      pitch: 0.07,
    },
    fov: 75,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
