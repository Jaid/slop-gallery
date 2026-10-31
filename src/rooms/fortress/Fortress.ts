import {Geofence} from 'geofency'

import {fortressOrigin} from '#src/lib/gallery/fortress.ts'
import {fortressNetwork} from '#src/lib/gallery/fortressNetwork.ts'

import Room from '../base/Room.ts'
import chunkBoxes from '../lib/chunkBoxes.ts'
import footprint from '../lib/footprint.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import map from './map.svg?raw'
import spawns from './spawns.ts'
import walls from './walls.ts'

/** The passages’ air is cut into chunks whose boxes reach at most this far past their walls, which only takes more than one per piece round the curve, short of the Oculus’ apse behind it. */
const slack = 0.35

/**
 * The connected castle-stone passages from both Oculus bridges, around its apse to the Lodge and up the western hairpin to the Cinnabar.
 * Laid out around the middle of its curve, at the height of its floor there.
 */
export default class Fortress extends Room {
  override readonly air = chunkBoxes(fortressNetwork.flatMap(passage => passage.chunks(slack)), fortressOrigin)
  override readonly color = '#6e675d'
  override readonly description = 'Cold stone. Long shadows. Light through iron bars.'
  // Height-bounded because the west wing passes under Cinnabar and above Lodge. It also takes precedence over the Oculus’ apse box.
  override readonly fence = new Geofence(this.air.map(box => ({
    ...footprint([box]),
    y: box.min.y - 1,
    y2: box.max.y + 0.5,
  })))
  override readonly id = 'fortress'
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'The Fortress',
      cameras,
      spawns,
      lamps,
      skybox: 'sky',
      // The passage lies deep under the ground floor, out of the sun’s reach.
      sunlit: false,
      volumetricSun: 0,
      walls,
      map,
    })
  }
}
