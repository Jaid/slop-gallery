import type {RoomCamera} from '../base/Room.ts'

export default {
  overview: {
    position: [4.19, 3.628, 13.32],
    aim: {
      yaw: 0.1965,
      pitch: -0.2528,
    },
    fov: 80,
    ratio: 16 / 9,
  },
  stairs: {
    // On the lower flight’s centerline, looking due west, so its walls frame the view symmetrically.
    position: [16.63, 3.1, 0],
    aim: {
      yaw: Math.PI / 2,
      pitch: -0.35,
    },
    fov: 60,
    ratio: 16 / 9,
  },
} satisfies Record<string, RoomCamera>
