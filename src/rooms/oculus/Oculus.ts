import lowerGallery from '#src/lib/gallery/lowerGallery.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import southSpawn from '../lib/southSpawn.ts'
import lamps from './lamps.ts'
import slots from './slots.ts'

const {oculus} = lowerGallery

export default class Oculus extends Room {
  override readonly description = 'Borrowed light from the gallery above.'
  // Up to the ceiling’s underside, not the upper room’s walkable surface.
  override readonly fence = floorBox(oculus.size, 0, oculus.ceiling.topY - oculus.ceiling.thickness - oculus.floorY)
  override readonly id = 'oculus'
  override readonly origin = floorOrigin(oculus, oculus.floorY)
  override readonly spawn = southSpawn(oculus.size)

  constructor() {
    super({
      title: 'Oculus',
      lamps,
      slots,
    })
  }
}
