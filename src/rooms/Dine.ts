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
      slots: {
        'dine-north-0': {
          wallId: 'dine-north',
          ratio: '2:3',
          area: 30_000,
          position: [-3.7125, 3.1325, -11.78],
          rotation: 0,
        },
        'dine-north-1': {
          wallId: 'dine-north',
          ratio: '2:3',
          area: 30_000,
          position: [3.7125, 3.1325, -11.78],
          rotation: 0,
        },
        'dine-east-0': {
          wallId: 'dine-east',
          ratio: '3:2',
          area: 30_000,
          position: [5.78, 3.1325, -9.356],
          rotation: -Math.PI / 2,
        },
        'dine-east-1': {
          wallId: 'dine-east',
          ratio: '3:2',
          area: 30_000,
          position: [5.78, 3.1325, -4.678],
          rotation: -Math.PI / 2,
        },
        'dine-east-2': {
          wallId: 'dine-east',
          ratio: '3:2',
          area: 30_000,
          position: [5.78, 3.1325, 0],
          rotation: -Math.PI / 2,
        },
        'dine-south-0': {
          wallId: 'dine-south',
          ratio: '3:2',
          area: 30_000,
          position: [3.7967, 3.1325, 11.78],
          rotation: Math.PI,
        },
        'dine-south-1': {
          wallId: 'dine-south',
          ratio: '3:2',
          area: 30_000,
          position: [0, 3.1325, 11.78],
          rotation: Math.PI,
        },
        'dine-south-2': {
          wallId: 'dine-south',
          ratio: '3:2',
          area: 30_000,
          position: [-3.7967, 3.1325, 11.78],
          rotation: Math.PI,
        },
        'dine-west-0': {
          wallId: 'dine-west',
          ratio: '2:3',
          area: 30_000,
          position: [-5.78, 3.1325, 10.2125],
          rotation: Math.PI / 2,
        },
        'dine-west-1': {
          wallId: 'dine-west',
          ratio: '3:2',
          area: 30_000,
          position: [-5.78, 3.1325, 3.1494],
          rotation: Math.PI / 2,
        },
        'dine-west-2': {
          wallId: 'dine-west',
          ratio: '3:2',
          area: 30_000,
          position: [-5.78, 3.1325, -1.0919],
          rotation: Math.PI / 2,
        },
      },
    })
  }
}
