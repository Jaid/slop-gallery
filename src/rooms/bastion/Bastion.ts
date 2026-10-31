import {Geofence} from 'geofency'

import {bastionOrigin, bastionPassages} from '#src/lib/gallery/bastion.ts'

import Room from '../base/Room.ts'
import chunkBoxes from '../lib/chunkBoxes.ts'
import footprint from '../lib/footprint.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import map from './map.svg?raw'
import spawns from './spawns.ts'
import walls from './walls.ts'

/** The passages’ air is cut into chunks whose boxes reach at most this far past their walls, which only takes more than one per piece round the hairpin’s turn. */
const slack = 0.35

/**
 * The vaulted castle-stone passage from the doorway at the end of the Oculus’ west bridge: west under the Cinnabar, up a hairpin ramp beside the Vesper, north over the Lodge’s roof and east along the strip behind the Cinnabar’s north wall, into the Cinnabar.
 * Laid out around the apex of its hairpin, at the height of its floor there.
 */
export default class Bastion extends Room {
  override readonly air = chunkBoxes(bastionPassages.flatMap(passage => passage.chunks(slack)), bastionOrigin)
  override readonly color = '#6b6358'
  override readonly description = 'Cold stone, climbing. The long way up to the red room.'
  // Each box of its air from a meter under its floor to a little over its vault, since its mouth runs under the Cinnabar and its run north over the Lodge; it comes before the Lodge, whose fence reaches up through its roof.
  override readonly fence = new Geofence(this.air.map(box => ({
    ...footprint([box]),
    y: box.min.y - 1,
    y2: box.max.y + 0.5,
  })))
  override readonly id = 'bastion'
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'The Bastion',
      cameras,
      spawns,
      lamps,
      skybox: 'sky',
      // The passage runs under the ground floor and behind the Vesper’s and the Cinnabar’s walls, out of the sun’s reach.
      sunlit: false,
      volumetricSun: 0,
      walls,
      map,
    })
  }
}
