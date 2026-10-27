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
      title: 'Dine',
      // Three breakable LED panes down the middle, each lighting through one point just below its diffuser.
      lamps: {
        led_north: led(-5),
        led_middle: led(0),
        led_south: led(5),
      },
      slots: {
        north_0: {
          wallId: 'north',
          ratio: '2:3',
          area: 30_000,
          position: [-3.7125, 3.1325, -11.78],
          rotation: 0,
        },
        north_1: {
          wallId: 'north',
          ratio: '2:3',
          area: 30_000,
          position: [3.7125, 3.1325, -11.78],
          rotation: 0,
        },
        east_0: {
          wallId: 'east',
          ratio: '3:2',
          area: 30_000,
          position: [5.78, 3.1325, -9.356],
          rotation: -Math.PI / 2,
        },
        east_1: {
          wallId: 'east',
          ratio: '3:2',
          area: 30_000,
          position: [5.78, 3.1325, -4.678],
          rotation: -Math.PI / 2,
        },
        east_2: {
          wallId: 'east',
          ratio: '3:2',
          area: 30_000,
          position: [5.78, 3.1325, 0],
          rotation: -Math.PI / 2,
        },
        south_0: {
          wallId: 'south',
          ratio: '3:2',
          area: 30_000,
          position: [3.7967, 3.1325, 11.78],
          rotation: Math.PI,
        },
        south_1: {
          wallId: 'south',
          ratio: '3:2',
          area: 30_000,
          position: [0, 3.1325, 11.78],
          rotation: Math.PI,
        },
        south_2: {
          wallId: 'south',
          ratio: '3:2',
          area: 30_000,
          position: [-3.7967, 3.1325, 11.78],
          rotation: Math.PI,
        },
        west_0: {
          wallId: 'west',
          ratio: '2:3',
          area: 30_000,
          position: [-5.78, 3.1325, 10.2125],
          rotation: Math.PI / 2,
        },
        west_1: {
          wallId: 'west',
          ratio: '3:2',
          area: 30_000,
          position: [-5.78, 3.1325, 3.1494],
          rotation: Math.PI / 2,
        },
        west_2: {
          wallId: 'west',
          ratio: '3:2',
          area: 30_000,
          position: [-5.78, 3.1325, -1.0919],
          rotation: Math.PI / 2,
        },
      },
    })
  }
}
