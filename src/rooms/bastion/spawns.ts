import type {RoomSpawn} from '../base/Room.ts'

export default {
  // In the middle of the curve, looking west round it toward the Lodge.
  '': {
    position: [0, 0.04, 0],
    yaw: Math.PI / 2,
    pitch: 0,
  },
} satisfies Record<string, RoomSpawn>
