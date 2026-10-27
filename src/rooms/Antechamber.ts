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
      number: 4,
      title: 'The Antechamber',
    })
  }
}
