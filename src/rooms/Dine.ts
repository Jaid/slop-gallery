import type {Lamp} from './base/Room.ts'

import {salonSouthZ} from '#src/lib/gallery/salon.ts'

import Room, {floorBox, floorOrigin, southSpawn} from './base/Room.ts'

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

export default class Dine extends Room<'dine'> {
  constructor() {
    super({
      id: 'dine',
      number: 3,
      title: 'Dine',
      description: 'A change of perspective is encouraged.',
      origin: floorOrigin(plan, 0),
      fence: floorBox(plan.size, 0, 5.8),
      spawn: southSpawn(plan.size),
      // Three breakable LED panes down the middle, each lighting through one point just below its diffuser.
      lamps: {
        'led-north': led(-5),
        'led-middle': led(0),
        'led-south': led(5),
      },
    })
  }
}
