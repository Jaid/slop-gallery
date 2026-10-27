import type {RoomAmbience} from '../base/Room.ts'

import MoonfallOrbitAmbience from '#src/lib/audio/ambience/MoonfallOrbit.ts'

export default {
  // A celestial hum from the orbital sculpture’s core.
  orbital_sculpture: {
    emitter: MoonfallOrbitAmbience,
    position: [0, 2.5, 0],
  },
} satisfies Record<string, RoomAmbience>
