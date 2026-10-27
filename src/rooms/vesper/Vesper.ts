import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import southSpawn from '../lib/southSpawn.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import slots from './slots.ts'
import spawns from './spawns.ts'

const plan = {
  center: [-14, 0],
  size: [12, 16],
} as const

export default class Vesper extends Room {
  override readonly description = 'Old masters. New misunderstandings.'
  override readonly fence = floorBox(plan.size, 0, 5.8)
  override readonly id = 'vesper'
  override readonly origin = floorOrigin(plan, 0)
  override readonly spawn = southSpawn(plan.size)

  constructor() {
    super({
      title: 'The Vesper',
      cameras,
      spawns,
      lamps,
      slots,
    })
  }
}
