import Room from './base/Room.ts'
import floorBox from './lib/floorBox.ts'
import floorOrigin from './lib/floorOrigin.ts'
import southSpawn from './lib/southSpawn.ts'

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
      number: 2,
      title: 'The Vesper',
      // The two light boxes in the ceiling.
      lamps: {
        'ceiling-north': {
          position: [0, 4.5, -3.5],
          strength: 40,
          tint: '#fff1d8',
          range: 14,
        },
        'ceiling-south': {
          position: [0, 4.5, 3.5],
          strength: 40,
          tint: '#fff1d8',
          range: 14,
        },
      },
    })
  }
}
