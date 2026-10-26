import corridor, {lodgeThreshold} from '#src/lib/gallery/corridor.ts'
import lodge from '#src/lib/gallery/lodge.ts'

import Room, {floorBox, southSpawn} from './base/Room.ts'

export default class Lodge extends Room<'lodge'> {
  constructor() {
    super({
      id: 'lodge',
      number: 8,
      title: 'Lodge',
      description: 'Weathered stone. Warm timber. A way back through the corridor.',
      fence: [
        floorBox(lodge, lodge.floorY, lodge.height),
        // The Lodge’s half of the doorway passage from the Corridor’s hall.
        floorBox(lodgeThreshold, corridor.floorY, corridor.height),
      ],
      spawn: southSpawn(lodge, lodge.floorY),
      volumetricSun: 0,
    })
  }
}
