import {salonSouthZ} from '#src/lib/gallery/salon.ts'

import Room, {floorBox, southSpawn} from './base/Room.ts'

// From the Salon’s south wall to the Vesper’s south wall’s line.
const plan = {
  center: [14, (salonSouthZ + 8) / 2],
  size: [12, 8 - salonSouthZ],
} as const

export default class Dine extends Room<'dine'> {
  constructor() {
    super({
      id: 'dine',
      number: 3,
      title: 'Dine',
      description: 'A change of perspective is encouraged.',
      fence: floorBox(plan, 0, 5.8),
      spawn: southSpawn(plan, 0),
    })
  }
}
