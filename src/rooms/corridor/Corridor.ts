import type {GroundSurface, RoomSpawn} from '../base/Room.ts'

import {Geofence} from 'geofency'

import corridor, {corridorPassage, corridorPaving, corridorStairs} from '#src/lib/gallery/corridor.ts'
import {floorChunks} from '#src/lib/gallery/floorPolygons.ts'
import lodge from '#src/lib/gallery/lodge.ts'
import {stairHeadroom} from '#src/lib/gallery/stairs/StairFlight.ts'

import Room from '../base/Room.ts'
import chunkBoxes from '../lib/chunkBoxes.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import lamps from './lamps.ts'
import map from './map.svg?raw'
import walls from './walls.ts'

const stairXs = corridorStairs.blocks.flatMap(block => [block.position[0] - block.size[0] / 2, block.position[0] + block.size[0] / 2])
const stairWestX = Math.min(...stairXs)
const stairEastX = Math.max(...stairXs)
const [originX, originZ] = corridor.center
/** The air round the Lodge’s bay is cut into chunks whose boxes reach at most this far past the walls, well short of the bay. */
const slack = 0.35

/** Laid out around the middle of its long hall, at the height of its floor. */
export default class Corridor extends Room {
  override readonly air = [
    // The passage from the Lodge’s threshold on, round the bay and down the long hall.
    ...chunkBoxes(floorChunks(corridorPaving, corridorPassage.floorY, corridorPassage.height, slack), [originX, corridor.floorY, originZ]),
    // The stair flight climbs from the passage’s south end to the Sienna’s doorway.
    floorBox([stairEastX - stairWestX, corridorStairs.width], corridorStairs.end[1] - corridor.floorY, corridorStairs.start[1] + stairHeadroom - corridorStairs.end[1], [(stairWestX + stairEastX) / 2 - originX, lodge.siennaZ - originZ]),
  ]
  override readonly color = '#8c6747'
  override readonly description = 'Timber, turns and the long way back to Sienna.'
  override readonly fence = new Geofence([
    // Each box of the passage’s air at every height, as nothing lies above or below it.
    ...this.air.slice(0, -1).map(box => footprint([box])),
    // The stair flight up to the Sienna, from the hall’s floor up; it comes after Moonfall, whose air lies right under the flight’s low end, and after the Sienna, whose wall the flight starts in.
    {
      ...footprint([this.air.at(-1)!]),
      floor: 0,
    },
  ])
  override readonly height = corridor.height
  override readonly id = 'corridor'
  override readonly size = corridor.size
  override readonly spawn = {
    position: [0, 0.04, 0],
    yaw: 0,
    pitch: 0,
  } satisfies RoomSpawn

  constructor() {
    super({
      title: 'Corridor',
      lamps,
      skybox: null,
      sunlit: false,
      volumetricSun: 0,
      walls,
      map,
    })
  }

  /** The boards sound hollow. */
  override groundSurface(): GroundSurface {
    return 'hollow'
  }
}
