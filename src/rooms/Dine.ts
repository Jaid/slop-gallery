import type {Lamp} from './base/Room.ts'

import {salonSouthZ} from '#src/lib/gallery/salon.ts'

import Room from './base/Room.ts'
import floorBox from './lib/floorBox.ts'
import floorOrigin from './lib/floorOrigin.ts'
import southSpawn from './lib/southSpawn.ts'

// From the Salon’s south wall to the Vesper’s south wall’s line.
const plan = {
  center: [14, (salonSouthZ + 8) / 2],
  size: [12, 8 - salonSouthZ],
} as const
const led = (z: number) => ({
  position: [0, 5.3, z],
  strength: 36,
  tint: '#eee3ff',
  range: 8,
  // Fades more gently than physical light, so the three pools blend into one even wash.
  decay: 1.5,
  optional: true,
}) satisfies Lamp

export default class Dine extends Room {
  override readonly description = 'A change of perspective is encouraged.'
  override readonly fence = floorBox(plan.size, 0, 5.8)
  override readonly id = 'dine'
  override readonly origin = floorOrigin(plan, 0)
  override readonly spawn = southSpawn(plan.size)

  constructor() {
    super({
      number: 3,
      title: 'Dine',
      // Three breakable LED panes down the middle, each lighting through one point just below its diffuser.
      lamps: {
        'led-north': led(-5),
        'led-middle': led(0),
        'led-south': led(5),
      },
    })
  }
}
