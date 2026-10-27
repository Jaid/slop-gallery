import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import slots from './slots.ts'
import spawns from './spawns.ts'
import stickyWalls from './stickyWalls.ts'

const plan = {
  center: [-14, 14],
  size: [12, 12],
} as const

export default class Sienna extends Room {
  override readonly color = '#674b37'
  override readonly description = 'Low light. Rich textures. Questionable company.'
  override readonly fence = floorBox(plan.size, 0, 5.8)
  override readonly floorY = 0
  override readonly id = 'sienna'
  override readonly origin = floorOrigin(plan, this.floorY)
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'The Sienna',
      cameras,
      spawns,
      lamps,
      slots,
      stickyWalls,
    })
  }
}
