import Room from './base/Room.ts'
import floorBox from './lib/floorBox.ts'
import floorOrigin from './lib/floorOrigin.ts'
import southSpawn from './lib/southSpawn.ts'

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
      lamps: {
        // Below the swinging chandelier’s metalwork at rest, so the fixture can’t shadow its own source.
        chandelier: {
          position: [0, 3.05, 0],
          strength: 110,
          tint: '#ffd36c',
          range: 15,
          decay: 1.75,
          shadow: true,
        },
      },
      slots: {
        north_0: {
          wallId: 'north',
          ratio: '1:1',
          area: 15_000,
          position: [-1, 3.15, -5.78],
          rotation: 0,
        },
        east_0: {
          wallId: 'east',
          ratio: '1:1',
          area: 15_000,
          position: [5.78, 3.15, -3],
          rotation: -Math.PI / 2,
        },
        east_1: {
          wallId: 'east',
          ratio: '1:1',
          area: 15_000,
          position: [5.78, 3.15, 3],
          rotation: -Math.PI / 2,
        },
        south_0: {
          wallId: 'south',
          ratio: '1:1',
          area: 15_000,
          position: [3, 3.15, 5.78],
          rotation: Math.PI,
        },
        south_1: {
          wallId: 'south',
          ratio: '1:1',
          area: 15_000,
          position: [-3, 3.15, 5.78],
          rotation: Math.PI,
        },
        west_0: {
          wallId: 'west',
          ratio: '1:1',
          area: 15_000,
          position: [-5.78, 3.15, 3],
          rotation: Math.PI / 2,
        },
      },
    })
  }
}
