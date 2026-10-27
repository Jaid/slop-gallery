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
      slots: {
        'vesper-north-0': {
          wallId: 'vesper-north',
          ratio: '1:1',
          area: 100_000,
          position: [0, 3.2, -7.78],
          rotation: 0,
        },
        'vesper-west-0': {
          wallId: 'vesper-west',
          ratio: '1:1',
          area: 100_000,
          position: [-5.78, 3.2, 0],
          rotation: Math.PI / 2,
        },
      },
    })
  }
}
