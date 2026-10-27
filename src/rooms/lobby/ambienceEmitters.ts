import type {RoomAmbience} from '../base/Room.ts'

import FountainAmbience from '#src/lib/audio/ambience/Fountain.ts'

export default {
  // From the finial’s tip, the main jet’s mouth.
  fountain: {
    emitter: FountainAmbience,
    position: [0, 3.02, 0],
  },
} satisfies Record<string, RoomAmbience>
