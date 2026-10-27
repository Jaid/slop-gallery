import lowerGallery from '#src/lib/gallery/lowerGallery.ts'
import {craterTerrain} from '#src/lib/gallery/moonfall/CraterTerrain.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import ambienceEmitters from './ambienceEmitters.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import spawns from './spawns.ts'

const {floorY, moonfall: plan, tunnel} = lowerGallery
const bottom = craterTerrain.lowest()

export default class Moonfall extends Room {
  override readonly description = 'Down the stairs. Out of the ordinary.'
  override readonly fence = [
    // Reaches down to the deepest air in the crater.
    floorBox(plan.size, bottom, 5.8 - bottom),
    // The exhibition tunnel, sloping down to the Oculus, from its low north end to the top of its high south end.
    floorBox([tunnel.width, tunnel.southZ - tunnel.northZ], tunnel.northY - floorY, tunnel.southY + tunnel.height - tunnel.northY, [tunnel.x - plan.center[0], (tunnel.northZ + tunnel.southZ) / 2 - plan.center[1]]),
  ]
  override readonly id = 'moonfall'
  override readonly origin = floorOrigin(plan, floorY)
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'Moonfall',
      cameras,
      spawns,
      ambience: ambienceEmitters,
      lamps,
      // The room lies under its own ceiling, so the sun never lights its air.
      volumetricSun: 0,
    })
  }
}
