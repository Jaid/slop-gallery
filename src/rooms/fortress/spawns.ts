import type {RoomSpawn} from '../base/Room.ts'

export default {
  // Halfway along the passage’s long run, looking west toward the Lodge.
  '': {
    position: [-9, 0.04, 0],
    yaw: Math.PI / 2,
    pitch: 0,
  },
} satisfies Record<string, RoomSpawn>
