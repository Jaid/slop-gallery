import {Geofence} from 'geofency'

import {groundFenceY} from '#src/lib/gallery/floors.ts'
import lowerGallery from '#src/lib/gallery/lowerGallery.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import cameras from './cameras.ts'
import slots from './slots.ts'
import spawns from './spawns.ts'
import walls from './walls.ts'

const {oculus} = lowerGallery
// Up to the ceiling’s underside, not the upper room’s walkable surface.
const height = oculus.ceiling.topY - oculus.ceiling.thickness - oculus.floorY

/** Laid out around the middle of its floor plan, at the height of its floor. */
export default class Oculus extends Room {
  override readonly air = floorBox(oculus.size, 0, height)
  override readonly color = '#7e9298'
  override readonly description = 'Borrowed light from the gallery above.'
  // Everything under its floor plan, up into the slab of the Lobby above; it comes before the Exhibition, so the middle of the balcony is the Oculus’.
  override readonly fence = new Geofence([{
    ...footprint([this.air]),
    ceiling: groundFenceY - oculus.floorY,
  }])
  override readonly height = height
  override readonly id = 'oculus'
  override readonly size = oculus.size
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'Oculus',
      cameras,
      spawns,
      slots,
      walls,
    })
  }
}
