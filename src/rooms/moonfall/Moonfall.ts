import lowerGallery from '#src/lib/gallery/lowerGallery.ts'
import {craterTerrain} from '#src/lib/gallery/moonfall/CraterTerrain.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import southSpawn from '../lib/southSpawn.ts'
import ambienceEmitters from './ambienceEmitters.ts'
import lamps from './lamps.ts'

const {floorY, moonfall: plan} = lowerGallery
const bottom = craterTerrain.lowest()

export default class Moonfall extends Room {
  override readonly description = 'Down the stairs. Out of the ordinary.'
  // Reaches down to the deepest air in the crater.
  override readonly fence = floorBox(plan.size, bottom, 5.8 - bottom)
  override readonly id = 'moonfall'
  override readonly origin = floorOrigin(plan, floorY)
  override readonly spawn = southSpawn(plan.size)

  constructor() {
    super({
      title: 'Moonfall',
      ambience: ambienceEmitters,
      lamps,
      // The room lies under its own ceiling, so the sun never lights its air.
      volumetricSun: 0,
    })
  }
}
