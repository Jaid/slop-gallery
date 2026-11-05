import {Geofence} from 'geofency'

import reverberation from '#src/lib/audio/acoustics/reverberation.ts'
import cinnabar, {cinnabarVestibule} from '#src/lib/gallery/cinnabar.ts'
import {groundFenceY} from '#src/lib/gallery/floors.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import cameras from './cameras.ts'
import map from './map.svg?raw'
import spawns from './spawns.ts'
import walls from './walls.ts'

const {center: [vestibuleX, vestibuleZ], radius} = cinnabarVestibule

/** Lit through its round rooflight and its vestibule’s, without lamps of its own. */
export default class Cinnabar extends Room {
  override readonly air = [
    floorBox(cinnabar.size, 0, 5.8),
    // The round vestibule north of its arch, as high, where the Fortress arrives.
    floorBox([radius * 2, radius * 2], 0, 5.8, [vestibuleX - cinnabar.center[0], vestibuleZ - cinnabar.center[1]]),
  ]
  override readonly description = 'A round eye on the sky.'
  // Everything over its floor plan and its vestibule’s from the slab up, the rooflights included; the Fortress’ western mouth passes underneath, below the slab, and its curve under the vestibule. It comes before the Fortress, so the vestibule’s wall with the arch onto the approach is the Cinnabar’s.
  override readonly fence = new Geofence(this.air.map(box => ({
    ...footprint([box]),
    floor: groundFenceY,
  })))
  override readonly height = 5.8
  override readonly id = 'cinnabar'
  override readonly size = cinnabar.size
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'The Cinnabar',
      // Plain stone and plaster round a rooflight, its round vestibule ringing faintly.
      acoustics: reverberation({
        decay: 1.8,
        predelay: 0.018,
        brightness: [7500, 2000],
        early: [[0.03, 0.3], [0.06, 0.18]],
        wet: 0.18,
      }),
      frame: 'cinnabar-meander',
      cameras,
      spawns,
      skybox: 'sky',
      walls,
      map,
    })
  }
}
