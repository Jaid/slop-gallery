import {antechamberDomeCrownY} from '#src/lib/gallery/antechamberDome.ts'
import staircase from '#src/lib/gallery/staircase.ts'

import Room, {eyeHeight, floorBox} from './base/Room.ts'

const plan = {
  center: [0, staircase.z],
  size: [8, 8],
} as const

export default class Antechamber extends Room<'antechamber'> {
  constructor() {
    super({
      id: 'antechamber',
      number: 4,
      title: 'The Antechamber',
      description: 'A pause between the peculiar and the profound.',
      // Up to the crown of the dome.
      fence: floorBox(plan, 0, antechamberDomeCrownY),
      // Just north of the middle, looking south toward the stairs.
      spawn: {
        position: [plan.center[0], eyeHeight, plan.center[1] - 1.1],
        rotation: [0, 1, 0, 0],
      },
    })
  }
}
