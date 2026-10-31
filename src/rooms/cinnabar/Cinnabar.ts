import {Geofence} from 'geofency'

import cinnabar from '#src/lib/gallery/cinnabar.ts'
import {groundFenceY} from '#src/lib/gallery/floors.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import cameras from './cameras.ts'
import map from './map.svg?raw'
import spawns from './spawns.ts'
import walls from './walls.ts'

/** Lit through its round rooflight, without lamps of its own. */
export default class Cinnabar extends Room {
  override readonly air = floorBox(cinnabar.size, 0, 5.8)
  override readonly color = '#8e2f24'
  override readonly description = 'Pompeian red, polished terrazzo and a round eye on the sky.'
  // Everything over its floor plan from the slab up, the rooflight included; the Bastion’s mouth passes underneath, below the slab.
  override readonly fence = new Geofence([{
    ...footprint([this.air]),
    floor: groundFenceY,
  }])
  override readonly height = 5.8
  override readonly id = 'cinnabar'
  override readonly size = cinnabar.size
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'The Cinnabar',
      cameras,
      spawns,
      skybox: 'sky',
      walls,
      map,
    })
  }
}
