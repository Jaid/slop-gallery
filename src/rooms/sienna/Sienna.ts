import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import southSpawn from '../lib/southSpawn.ts'
import lamps from './lamps.ts'
import slots from './slots.ts'

const plan = {
  center: [-14, 14],
  size: [12, 12],
} as const

export default class Sienna extends Room {
  override readonly description = 'Low light. Rich textures. Questionable company.'
  override readonly fence = floorBox(plan.size, 0, 5.8)
  override readonly id = 'sienna'
  override readonly origin = floorOrigin(plan, 0)
  override readonly spawn = southSpawn(plan.size)

  constructor() {
    super({
      title: 'The Sienna',
      lamps,
      slots,
    })
  }
}
