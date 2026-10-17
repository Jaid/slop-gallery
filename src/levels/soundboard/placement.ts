import {soundboardBounds, soundboardWalls} from '#src/lib/audio/soundboard.ts'
import {HallPlacementSpace} from '#src/lib/placement/HallPlacementSpace.ts'

import {playerSpawn} from './navigation.ts'

/** Artworks hang on the hall’s walls around the button panels, which stay playable, and lost ones return to the spawn. */
const soundboardPlacement = new HallPlacementSpace(soundboardWalls, soundboardBounds, [playerSpawn.position[0], 1, playerSpawn.position[2]])

export default soundboardPlacement
