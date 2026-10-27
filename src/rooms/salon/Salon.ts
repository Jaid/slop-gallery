import salon from '#src/lib/gallery/salon.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import spawns from './spawns.ts'

/** Lit through its skylight, without lamps of its own. */
export default class Salon extends Room {
  override readonly description = 'Hung frame to frame. Judged elbow to elbow.'
  override readonly fence = floorBox(salon.size, 0, 5.8)
  override readonly id = 'salon'
  override readonly origin = floorOrigin(salon, 0)
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'The Salon',
      spawns,
    })
  }
}
