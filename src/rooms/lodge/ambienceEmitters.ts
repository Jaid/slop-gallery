import type {RoomAmbience} from '../base/Room.ts'

import LodgeFireAmbience from '#src/lib/audio/ambience/LodgeFire.ts'

export default {
  fire: {
    emitter: LodgeFireAmbience,
    position: [0, 0.6, 4.2],
  },
} satisfies Record<string, RoomAmbience>
