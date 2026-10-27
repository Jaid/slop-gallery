import salon from '#src/lib/gallery/salon.ts'

import Room from './base/Room.ts'
import floorBox from './lib/floorBox.ts'
import floorOrigin from './lib/floorOrigin.ts'
import southSpawn from './lib/southSpawn.ts'

/** Lit through its skylight, without lamps of its own. */
export default class Salon extends Room {
  override readonly description = 'Hung frame to frame. Judged elbow to elbow.'
  override readonly fence = floorBox(salon.size, 0, 5.8)
  override readonly id = 'salon'
  override readonly origin = floorOrigin(salon, 0)
  override readonly spawn = southSpawn(salon.size)

  constructor() {
    super({
      number: 10,
      title: 'The Salon',
    })
  }
}
