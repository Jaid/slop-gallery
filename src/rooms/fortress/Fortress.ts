import {Geofence} from 'geofency'

import {fortressApproach, fortressCurve, fortressMouth, fortressOrigin} from '#src/lib/gallery/fortress.ts'

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
 * The vaulted castle-stone passage from the doorway at the end of the Oculus’ east bridge, north along the Oculus and round its apse, to the Lodge’s east wall.
 * Laid out around the middle of its curve, at the height of its floor there.
 */
export default class Fortress extends Room {
  override readonly air = chunkBoxes([fortressMouth, fortressApproach, fortressCurve].flatMap(passage => passage.chunks(slack)), fortressOrigin)
  override readonly color = '#6e675d'
  override readonly description = 'Cold stone. Long shadows. Light through iron bars.'
  // Each box of its air at every height, as nothing lies above or below it. It comes before the Oculus, whose fence takes in the whole box around the apse it curves round.
  override readonly fence = new Geofence(this.air.map(box => footprint([box])))
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
