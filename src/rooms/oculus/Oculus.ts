import lowerGallery from '#src/lib/gallery/lowerGallery.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import cameras from './cameras.ts'
import slots from './slots.ts'
import spawns from './spawns.ts'
import stickyWalls from './stickyWalls.ts'

const {oculus} = lowerGallery

export default class Oculus extends Room {
  override readonly description = 'Borrowed light from the gallery above.'
  // Up to the ceiling’s underside, not the upper room’s walkable surface.
  override readonly fence = floorBox(oculus.size, 0, oculus.ceiling.topY - oculus.ceiling.thickness - oculus.floorY)
  override readonly id = 'oculus'
  override readonly origin = floorOrigin(oculus, oculus.floorY)
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'Oculus',
      cameras,
      spawns,
      slots,
      stickyWalls,
    })
  }
}
