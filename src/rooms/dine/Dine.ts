import {salonSouthZ} from '#src/lib/gallery/salon.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import slots from './slots.ts'
import spawns from './spawns.ts'
import stickyWalls from './stickyWalls.ts'

// From the Salon’s south wall to the Vesper’s south wall’s line.
const plan = {
  center: [14, (salonSouthZ + 8) / 2],
  size: [12, 8 - salonSouthZ],
} as const

export default class Dine extends Room {
  override readonly color = '#af9294'
  override readonly description = 'A change of perspective is encouraged.'
  override readonly fence = floorBox(plan.size, 0, 5.8)
  override readonly floorY = 0
  override readonly id = 'dine'
  override readonly origin = floorOrigin(plan, this.floorY)
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'Dine',
      cameras,
      spawns,
      lamps,
      slots,
      stickyWalls,
    })
  }
}
