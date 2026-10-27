import type {RoomSpawn} from '../base/Room.ts'

import {antechamberDomeCrownY} from '#src/lib/gallery/antechamberDomeShape.ts'
import staircase from '#src/lib/gallery/staircase.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import cameras from './cameras.ts'
import slots from './slots.ts'
import stickyWalls from './stickyWalls.ts'

const plan = {
  center: [0, staircase.z],
  size: [8, 8],
} as const

/** Lit through the windows of its dome, without lamps of its own. */
export default class Antechamber extends Room {
  override readonly color = '#d4be90'
  override readonly description = 'A pause between the peculiar and the profound.'
  // Up to the crown of the dome.
  override readonly fence = floorBox(plan.size, 0, antechamberDomeCrownY)
  override readonly floorY = 0
  override readonly id = 'antechamber'
  override readonly origin = floorOrigin(plan, this.floorY)
  // Just north of the middle, looking south toward the stairs.
  override readonly spawn = {
    position: [0, 0.04, -1.1],
    yaw: -Math.PI,
    pitch: 0,
  } satisfies RoomSpawn

  constructor() {
    super({
      title: 'The Antechamber',
      cameras,
      slots,
      stickyWalls,
    })
  }
}
