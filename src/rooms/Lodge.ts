import corridor, {lodgeThreshold} from '#src/lib/gallery/corridor.ts'
import lodge from '#src/lib/gallery/lodge.ts'

import Room, {floorBox, floorOrigin, southSpawn} from './base/Room.ts'

export default class Lodge extends Room<'lodge'> {
  constructor() {
    super({
      id: 'lodge',
      number: 8,
      title: 'Lodge',
      description: 'Weathered stone. Warm timber. A way back through the corridor.',
      origin: floorOrigin(lodge, lodge.floorY),
      fence: [
        floorBox(lodge.size, 0, lodge.height),
        // The Lodge’s half of the doorway passage from the Corridor’s hall.
        floorBox(lodgeThreshold.size, corridor.floorY - lodge.floorY, corridor.height, [lodgeThreshold.center[0] - lodge.center[0], lodgeThreshold.center[1] - lodge.center[1]]),
      ],
      spawn: southSpawn(lodge.size),
      lamps: {
        // High above the front log, flickering around an average of 90%.
        fire: {
          position: [0, 1.1, 3.9],
          strength: 68,
          tint: '#ffb45b',
          range: 10,
          shadow: true,
        },
        // In the candle plane of the wagon wheel, below its rim, so the iron never shadows its own light.
        chandelier: {
          position: [0, 2.91, 1],
          strength: 20,
          tint: '#ffc68a',
          range: 5,
          decay: 1.25,
          shadow: true,
        },
      },
      volumetricSun: 0,
    })
  }
}
