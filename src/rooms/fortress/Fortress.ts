import {Geofence} from 'geofency'
import {Box3, Vector3} from 'three/webgpu'

import {fortressApproach, fortressCurve, fortressMouth, fortressOrigin} from '#src/lib/gallery/fortress.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import map from './map.svg?raw'
import spawns from './spawns.ts'
import walls from './walls.ts'

const [originX, originY, originZ] = fortressOrigin
/** The curve’s air is cut into chunks whose boxes reach at most this far past its walls, short of the Oculus’ apse behind them. */
const slack = 0.35

/**
 * The vaulted castle-stone passage from the doorway at the end of the Oculus’ east bridge, north along the Oculus and round its apse, to the Lodge’s east wall.
 * Laid out around the middle of its curve, at the height of its floor there.
 */
export default class Fortress extends Room {
  override readonly air = [
    ...[fortressMouth, fortressApproach].flatMap(passage => passage.floors.map(({center, size}) => floorBox(size, passage.floorY - originY, passage.height, [center[0] - originX, center[1] - originZ]))),
    ...fortressCurve.chunks(slack).map(({min, max}) => new Box3(new Vector3(min[0] - originX, min[1] - originY, min[2] - originZ), new Vector3(max[0] - originX, max[1] - originY, max[2] - originZ))),
  ]
  override readonly color = '#6e675d'
  override readonly description = 'Cold stone. Long shadows. Two lanterns to share.'
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
