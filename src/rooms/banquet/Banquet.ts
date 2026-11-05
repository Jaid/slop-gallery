import {Geofence} from 'geofency'

import reverberation from '#src/lib/audio/transformers/reverberation.ts'
import {banquet} from '#src/lib/gallery/banquet.ts'
import {groundFenceY} from '#src/lib/gallery/floors.ts'
import RoomMood from '#src/lib/moods/RoomMood.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import map from './map.svg?raw'
import slots from './slots.ts'
import spawns from './spawns.ts'
import walls from './walls.ts'

const {size, height} = banquet

export default class Banquet extends Room {
  override readonly air = floorBox(size, 0, height)
  override readonly description = 'A change of perspective is encouraged.'
  // Everything over its floor plan from the slab up; it comes before the Salon, so the wall they share is the Banquet’s.
  override readonly fence = new Geofence([{
    ...footprint([this.air]),
    floor: groundFenceY,
  }])
  override readonly height = height
  override readonly id = 'banquet'
  override readonly size = size
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'The Banquet',
      moods: [
        new RoomMood({
          id: 'banquet',
          title: 'Marble checker',
          // Polished marble checker under a hard ceiling: bright and lively.
          transformer: reverberation({
            decay: 1.7,
            predelay: 0.017,
            brightness: [8500, 2400],
            early: [[0.013, 0.42], [0.029, 0.28]],
            wet: 0.18,
          }),
        }),
      ],
      frame: ['banquet-perspective', 'banquet-deco', 'banquet-checker'],
      cameras,
      spawns,
      lamps,
      skybox: 'sky',
      slots,
      walls,
      map,
    })
  }
}
