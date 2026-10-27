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
        sienna_north_0: {
          wallId: 'sienna_north',
          ratio: '1:1',
          area: 15_000,
          position: [-1, 3.15, -5.78],
          rotation: 0,
        },
        sienna_east_0: {
          wallId: 'sienna_east',
          ratio: '1:1',
          area: 15_000,
          position: [5.78, 3.15, -3],
          rotation: -Math.PI / 2,
        },
        sienna_east_1: {
          wallId: 'sienna_east',
          ratio: '1:1',
          area: 15_000,
          position: [5.78, 3.15, 3],
          rotation: -Math.PI / 2,
        },
        sienna_south_0: {
          wallId: 'sienna_south',
          ratio: '1:1',
          area: 15_000,
          position: [3, 3.15, 5.78],
          rotation: Math.PI,
        },
        sienna_south_1: {
          wallId: 'sienna_south',
          ratio: '1:1',
          area: 15_000,
          position: [-3, 3.15, 5.78],
          rotation: Math.PI,
        },
        sienna_west_0: {
          wallId: 'sienna_west',
          ratio: '1:1',
          area: 15_000,
          position: [-5.78, 3.15, 3],
          rotation: Math.PI / 2,
        },
      },
    })
  }
}
