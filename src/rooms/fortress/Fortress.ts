import type {GroundSurface} from '../base/Room.ts'
import type {Vec3} from 'math'

import {Geofence} from 'geofency'

import reverberation from '#src/lib/audio/transformers/reverberation.ts'
import {bastionApex} from '#src/lib/gallery/bastion.ts'
import {fortressOrigin, fortressTransition} from '#src/lib/gallery/fortress.ts'
import {fortressNetwork} from '#src/lib/gallery/fortressNetwork.ts'
import RoomMood from '#src/lib/moods/RoomMood.ts'

import Room from '../base/Room.ts'
import chunkBoxes from '../lib/chunkBoxes.ts'
import footprint from '../lib/footprint.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import map from './map.svg?raw'
import spawns from './spawns.ts'
import upperMap from './upperMap.svg?raw'
import walls from './walls.ts'

/** The passages’ air is cut into chunks whose boxes reach at most this far past their walls, which only takes more than one per piece round the curve, short of the Oculus’ apse behind it. */
const slack = 0.35

/**
 * The connected castle-stone passages from both Oculus bridges, around its apse to the Lodge and up the western hairpin to the Cinnabar.
 * Laid out around the middle of its curve, at the height of its floor there.
 */
export default class Fortress extends Room {
  override readonly air = chunkBoxes(fortressNetwork.flatMap(passage => passage.chunks(slack)), fortressOrigin)
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
      moods: [
        new RoomMood({
          id: 'fortress',
          title: 'Cold stone',
          // Stone passages: dark and long, with slaps between their close walls.
          transformer: reverberation({
            decay: 2.7,
            predelay: 0.009,
            brightness: [6000, 1200],
            flutter: [0.024, 7, 0.45],
            wet: 0.26,
          }),
        }),
      ],
      frame: ['fortress-strapwork', 'fortress-oak'],
      cameras,
      spawns,
      lamps,
      skybox: 'sky',
      // The passage lies deep under the ground floor, out of the sun’s reach.
      sunlit: false,
      volumetricSun: 0,
      walls,
      map,
      // From the apex of the western hairpin on, the climb shows on the upper floor with the Cinnabar it leads to.
      upperMap: {
        from: bastionApex.y - fortressOrigin[1],
        map: upperMap,
      },
    })
  }

  /** The flagstones grind underfoot, the planks of the timber end by the Lodge sound hollow. */
  override groundSurface([x, , z]: Vec3): GroundSurface {
    const {center, size} = fortressTransition.floor
    const onPlanks = Math.abs(x + fortressOrigin[0] - center[0]) <= size[0] / 2 + 1e-6 && Math.abs(z + fortressOrigin[2] - center[1]) <= size[1] / 2 + 1e-6
    return onPlanks ? 'hollow' : 'stone'
  }
}
