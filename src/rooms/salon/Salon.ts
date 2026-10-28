import salon from '#src/lib/gallery/salon.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import cameras from './cameras.ts'
import spawns from './spawns.ts'
import stickyWalls from './stickyWalls.ts'

/** Lit through its skylight, without lamps of its own. */
export default class Salon extends Room {
  override readonly color = '#7d2a31'
  override readonly description = 'Hung frame to frame. Judged elbow to elbow.'
  override readonly fence = floorBox(salon.size, 0, 5.8)
  override readonly floorY = 0
  override readonly id = 'salon'
  override readonly origin = floorOrigin(salon, this.floorY)
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'The Salon',
      cameras,
      spawns,
      stickyWalls,
    })
  }
}
