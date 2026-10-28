import lowerGallery from '#src/lib/gallery/lowerGallery.ts'
import tunnelDisplays from '#src/lib/gallery/tunnelDisplays.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import cameras from './cameras.ts'
import slots from './slots.ts'
import spawns from './spawns.ts'
import stickyWalls from './stickyWalls.ts'

const {oculus} = lowerGallery

export default class Oculus extends Room {
  override readonly color = '#7e9298'
  override readonly description = 'Borrowed light from the gallery above.'
  override readonly fence = [
    // Up to the ceiling’s underside, not the upper room’s walkable surface.
    floorBox(oculus.size, 0, oculus.ceiling.topY - oculus.ceiling.thickness - oculus.floorY),
    // The tunnel’s displays, with the stairways down to them from the balcony.
    ...tunnelDisplays.map(({stairway: {air}}) => floorBox(air.size, air.bottom - oculus.floorY, air.top - air.bottom, [air.center[0] - oculus.center[0], air.center[1] - oculus.center[1]])),
  ]
  override readonly floorY = oculus.floorY
  override readonly id = 'oculus'
  override readonly origin = floorOrigin(oculus, this.floorY)
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
