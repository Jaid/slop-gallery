import type {FloorSize, GroundSurface} from '../base/Room.ts'
import type {Vec3} from 'math'

import {Geofence} from 'geofency'

import {groundFenceY} from '#src/lib/gallery/floors.ts'
import {siennaRugSize} from '#src/lib/gallery/sienna.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import map from './map.svg?raw'
import slots from './slots.ts'
import spawns from './spawns.ts'
import walls from './walls.ts'

const size: FloorSize = [12, 12]
const height = 5.8

export default class Sienna extends Room {
  override readonly air = floorBox(size, 0, height)
  override readonly color = '#674b37'
  override readonly description = 'Low light. Rich textures. Questionable company.'
  // Everything over its floor plan from the slab up; it comes before the Corridor, so the wall with the doorway between them is the Sienna’s.
  override readonly fence = new Geofence([{
    ...footprint([this.air]),
    floor: groundFenceY,
  }])
  override readonly height = height
  override readonly id = 'sienna'
  override readonly size = size
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'The Sienna',
      cameras,
      spawns,
      lamps,
      skybox: 'sky',
      slots,
      walls,
      map,
    })
  }

  /** The rug in the middle muffles every step, the floorboards around it sound hollow. */
  override groundSurface([x, , z]: Vec3): GroundSurface {
    return Math.abs(x) <= siennaRugSize[0] / 2 + 1e-6 && Math.abs(z) <= siennaRugSize[1] / 2 + 1e-6 ? 'fabric' : 'hollow'
  }
}
