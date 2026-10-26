import lowerGallery from '#src/lib/gallery/lowerGallery.ts'
import {craterTerrain} from '#src/lib/gallery/moonfall/CraterTerrain.ts'

import Room, {floorBox, southSpawn} from './base/Room.ts'

const {floorY, moonfall: plan} = lowerGallery
// The fence reaches down to the deepest air in the crater.
const bottom = floorY + craterTerrain.lowest()

export default class Moonfall extends Room<'moonfall'> {
  constructor() {
    super({
      id: 'moonfall',
      number: 6,
      title: 'Moonfall',
      description: 'Down the stairs. Out of the ordinary.',
      fence: floorBox(plan, bottom, floorY + 5.8 - bottom),
      spawn: southSpawn(plan, floorY),
      // The room lies under its own ceiling, so the sun never lights its air.
      volumetricSun: 0,
    })
  }
}
