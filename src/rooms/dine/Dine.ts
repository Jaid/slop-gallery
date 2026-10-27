import {salonSouthZ} from '#src/lib/gallery/salon.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import southSpawn from '../lib/southSpawn.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import slots from './slots.ts'
import spawns from './spawns.ts'

// From the Salon’s south wall to the Vesper’s south wall’s line.
const plan = {
  center: [14, (salonSouthZ + 8) / 2],
  size: [12, 8 - salonSouthZ],
} as const

export default class Dine extends Room {
  override readonly description = 'A change of perspective is encouraged.'
  override readonly fence = floorBox(plan.size, 0, 5.8)
  override readonly id = 'dine'
  override readonly origin = floorOrigin(plan, 0)
  override readonly spawn = southSpawn(plan.size)

  constructor() {
    super({
      title: 'Dine',
      cameras,
      spawns,
      lamps,
      slots,
    })
  }
}
