import lowerGallery from '#src/lib/gallery/lowerGallery.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import southSpawn from '../lib/southSpawn.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import slots from './slots.ts'
import spawns from './spawns.ts'

const {oculus, tunnel} = lowerGallery

export default class Oculus extends Room {
  override readonly description = 'Borrowed light from the gallery above.'
  // The hall up to the ceiling’s underside, not the upper room’s walkable surface.
  override readonly fence = [
    floorBox(oculus.size, 0, oculus.ceiling.topY - oculus.ceiling.thickness - oculus.floorY),
    // The exhibition tunnel, sloping up to the Moonfall, from its low north end to the top of its high south end.
    floorBox([tunnel.width, tunnel.southZ - tunnel.northZ], tunnel.northY - oculus.floorY, tunnel.southY + tunnel.height - tunnel.northY, [tunnel.x - oculus.center[0], (tunnel.northZ + tunnel.southZ) / 2 - oculus.center[1]]),
  ]
  override readonly id = 'oculus'
  override readonly origin = floorOrigin(oculus, oculus.floorY)
  override readonly spawn = southSpawn(oculus.size)

  constructor() {
    super({
      title: 'Oculus',
      cameras,
      spawns,
      lamps,
      slots,
    })
  }
}
