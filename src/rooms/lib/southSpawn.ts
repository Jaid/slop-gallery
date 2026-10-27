import type {FloorSize, RoomSpawn} from '../base/Room.ts'

import eyeHeight from './eyeHeight.ts'

/** The spot visitors arrive at by default in a room of the size whose origin is the middle of its floor: at eye height, 2.4 m in from the middle of the south wall, looking north. */
export default function southSpawn([, depth]: FloorSize): RoomSpawn {
  return {
    position: [0, eyeHeight, depth / 2 - 2.4],
    rotation: [0, 0, 0, 1],
  }
}
