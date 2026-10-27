import corridor, {lodgeThreshold} from '#src/lib/gallery/corridor.ts'
import lodge from '#src/lib/gallery/lodge.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import ambienceEmitters from './ambienceEmitters.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import slots from './slots.ts'
import spawns from './spawns.ts'
import stickyWalls from './stickyWalls.ts'

export default class Lodge extends Room {
  override readonly description = 'Weathered stone. Warm timber. A way back through the corridor.'
  override readonly fence = [
    floorBox(lodge.size, 0, lodge.height),
    // The Lodge’s half of the doorway passage from the Corridor’s hall.
    floorBox(lodgeThreshold.size, corridor.floorY - lodge.floorY, corridor.height, [lodgeThreshold.center[0] - lodge.center[0], lodgeThreshold.center[1] - lodge.center[1]]),
  ]
  override readonly id = 'lodge'
  override readonly origin = floorOrigin(lodge, lodge.floorY)
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'Lodge',
      cameras,
      spawns,
      ambience: ambienceEmitters,
      lamps,
      volumetricSun: 0,
      slots,
      stickyWalls,
    })
  }
}
