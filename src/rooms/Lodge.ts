import LodgeFireAmbience from '#src/lib/audio/ambience/LodgeFire.ts'
import corridor, {lodgeThreshold} from '#src/lib/gallery/corridor.ts'
import lodge from '#src/lib/gallery/lodge.ts'

import Room from './base/Room.ts'
import floorBox from './lib/floorBox.ts'
import floorOrigin from './lib/floorOrigin.ts'
import southSpawn from './lib/southSpawn.ts'

export default class Lodge extends Room {
  override readonly description = 'Weathered stone. Warm timber. A way back through the corridor.'
  override readonly fence = [
    floorBox(lodge.size, 0, lodge.height),
    // The Lodge’s half of the doorway passage from the Corridor’s hall.
    floorBox(lodgeThreshold.size, corridor.floorY - lodge.floorY, corridor.height, [lodgeThreshold.center[0] - lodge.center[0], lodgeThreshold.center[1] - lodge.center[1]]),
  ]
  override readonly id = 'lodge'
  override readonly origin = floorOrigin(lodge, lodge.floorY)
  override readonly spawn = southSpawn(lodge.size)

  constructor() {
    super({
      title: 'Lodge',
      ambience: {
        fire: {
          emitter: LodgeFireAmbience,
          position: [0, 0.6, 4.2],
        },
      },
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
      slots: {
        north_0: {
          wallId: 'north',
          ratio: '3:2',
          area: 30_000,
          position: [-3, 2, -4.78],
          rotation: 0,
        },
        north_1: {
          wallId: 'north',
          ratio: '3:2',
          area: 30_000,
          position: [0, 2, -4.78],
          rotation: 0,
        },
        north_2: {
          wallId: 'north',
          ratio: '3:2',
          area: 30_000,
          position: [3, 2, -4.78],
          rotation: 0,
        },
        south_0: {
          wallId: 'south',
          ratio: '1:1',
          area: 15_000,
          position: [3.5, 2, 4.78],
          rotation: Math.PI,
        },
        south_1: {
          wallId: 'south',
          ratio: '1:1',
          area: 15_000,
          position: [-3.5, 2, 4.78],
          rotation: Math.PI,
        },
        east_0: {
          wallId: 'east',
          ratio: '1:1',
          area: 15_000,
          position: [4.78, 2, 1.5],
          rotation: -Math.PI / 2,
        },
      },
    })
  }
}
