import type {FloorSize, GroundSurface} from '../base/Room.ts'

import {Geofence} from 'geofency'

import {groundFenceY} from '#src/lib/gallery/floors.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import slots from './slots.ts'
import spawns from './spawns.ts'
import walls from './walls.ts'

const size: FloorSize = [12, 16]
const height = 5.8

export default class Vesper extends Room {
  override readonly air = floorBox(size, 0, height)
  override readonly color = '#7b9986'
  override readonly description = 'Old masters. New misunderstandings.'
  // Everything over its floor plan from the slab up.
  override readonly fence = new Geofence([{
    ...footprint([this.air]),
    floor: groundFenceY,
  }])
  override readonly height = height
  override readonly id = 'vesper'
  override readonly size = size
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'The Vesper',
      cameras,
      spawns,
      lamps,
      slots,
      walls,
    })
  }

  /** The parquet sounds hollow. */
  override groundSurface(): GroundSurface {
    return 'hollow'
  }
}
