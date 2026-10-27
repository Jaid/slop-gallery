import type {RoomSpawn} from './base/Room.ts'

import {antechamberDomeCrownY} from '#src/lib/gallery/antechamberDome.ts'
import staircase from '#src/lib/gallery/staircase.ts'

import Room from './base/Room.ts'
import eyeHeight from './lib/eyeHeight.ts'
import floorBox from './lib/floorBox.ts'
import floorOrigin from './lib/floorOrigin.ts'

const plan = {
  center: [0, staircase.z],
  size: [8, 8],
} as const

/** Lit through the windows of its dome, without lamps of its own. */
export default class Antechamber extends Room {
  override readonly description = 'A pause between the peculiar and the profound.'
  // Up to the crown of the dome.
  override readonly fence = floorBox(plan.size, 0, antechamberDomeCrownY)
  override readonly id = 'antechamber'
  override readonly origin = floorOrigin(plan, 0)
  // Just north of the middle, looking south toward the stairs.
  override readonly spawn = {
    position: [0, eyeHeight, -1.1],
    rotation: [0, 1, 0, 0],
  } satisfies RoomSpawn

  constructor() {
    super({
      title: 'The Antechamber',
      slots: {
        antechamber_south_0: {
          wallId: 'antechamber_south',
          ratio: '1:1',
          area: 100_000,
          position: [0, 3, 3.78],
          rotation: Math.PI,
        },
        antechamber_west_0: {
          wallId: 'antechamber_west',
          ratio: '1:1',
          area: 100_000,
          position: [-3.78, 3, 0],
          rotation: Math.PI / 2,
        },
      },
    })
  }
}
