import {Geofence} from 'geofency'

import {lodgeTunnel} from '#src/lib/gallery/lodge.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import spawns from './spawns.ts'
import walls from './walls.ts'

const [originX, originZ] = lodgeTunnel.path[1]

/** The vaulted castle-stone passage from the Oculus’ north arch to the Lodge’s east wall. Laid out around its elbow, at the height of its floor. */
export default class Fortress extends Room {
  override readonly air = lodgeTunnel.floors.map(({center, size}) => floorBox(size, 0, lodgeTunnel.height, [center[0] - originX, center[1] - originZ]))
  override readonly color = '#6e675d'
  override readonly description = 'Cold stone. Long shadows. One lantern to share.'
  // The whole passage at every height, as nothing lies above or below it.
  override readonly fence = new Geofence([footprint(this.air)])
  override readonly id = 'fortress'
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'The Fortress',
      cameras,
      spawns,
      lamps,
      // The passage lies deep under the ground floor, out of the sun’s reach.
      sunlit: false,
      volumetricSun: 0,
      walls,
    })
  }
}
