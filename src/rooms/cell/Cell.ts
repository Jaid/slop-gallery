import type {RoundVestibule} from '#src/lib/gallery/roundVestibule.ts'
import type {FloorSize, Lamp, RoomSpawn} from '../base/Room.ts'
import type {Vec3} from 'math'

import {Geofence} from 'geofency'

import {roundVestibuleWall} from '#src/lib/gallery/roundVestibule.ts'
import {chandelierLampY} from '#src/lib/physics/chandelier.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import {planWall} from '../lib/walls.ts'
import map from './map.svg?raw'
import slots from './slots.ts'

/** edge length of the floor’s marble tiles, the same as the Arena’s */
const tile = 0.6875
/** whole tiles from wall to wall, along both axes */
const size: FloorSize = [20 * tile, 20 * tile]
/** as high as the Arena, so the Sienna’s chandelier hangs from its ceiling as from the Sienna’s */
const height = 5.8
const northZ = -size[1] / 2
/** The round vestibule north of the room, like the Cinnabar’s: its wall touches the middle of the room’s north wall back to back, where a single arch opens through both. */
export const cellVestibule = {
  center: [0, northZ - 4],
  radius: 4,
  arch: {
    width: 3,
    height: 4.2,
    profile: 'arch',
  },
  arches: [
    {
      name: 'cell',
      angle: Math.PI / 2,
    },
  ],
} as const satisfies RoundVestibule
const [vestibuleX, vestibuleZ] = cellVestibule.center

/** The Sandbox’s one room: a sealed square in the Arena’s marble and velvet under the Sienna’s chandelier, with a round vestibule north of it under another one, laid out around the middle of its floor. Nothing in it but the Spook, Halloween and Horror Orbs on a pedestal in the vestibule. */
export default class Cell extends Room {
  override readonly air = [
    floorBox(size, 0, height),
    floorBox([cellVestibule.radius * 2, cellVestibule.radius * 2], 0, height, cellVestibule.center),
  ]
  override readonly color = '#5d242b'
  override readonly description = 'Nothing in it yet.'
  // Its whole floor plan and its vestibule’s at every height, as they are all there is.
  override readonly fence = new Geofence(this.air.map(box => footprint([box])))
  /** edge length of the floor’s marble tiles, which run whole from wall to wall */
  readonly floorTile = tile
  override readonly height = height
  override readonly id = 'cell'
  override readonly size = size
  // In front of the south wall, looking north through the arch at the orbs.
  override readonly spawn: RoomSpawn = {
    position: [0, 0.04, 4.5],
    yaw: 0,
    pitch: 0,
  }

  constructor() {
    super({
      title: 'Cell',
      map,
      slots,
      lamps: {
        // The Sienna’s, below the swinging chandelier’s metalwork at rest, so the fixture can’t shadow its own source; it swings along with it.
        chandelier: {
          position: [0, chandelierLampY, 0],
          strength: 110,
          tint: '#ffd36c',
          range: 15,
          decay: 1.75,
          shadow: true,
        },
        // The vestibule’s own chandelier over the orbs on their pedestal, the same fixture as the room’s, dimmer for the smaller room, where its walls and the pedestal’s cap stand much closer.
        vestibule_chandelier: {
          position: [vestibuleX, chandelierLampY, vestibuleZ],
          strength: 40,
          tint: '#ffd36c',
          range: 10,
          decay: 1.75,
          shadow: true,
        },
      } satisfies Record<string, Lamp>,
      // Four plain walls, which artworks may hang on, the north one opening into the vestibule.
      walls: {
        north: planWall(size, 'north', height, {
          holes: {
            vestibule: {
              ...cellVestibule.arch,
              u: vestibuleX,
            },
          },
        }),
        east: planWall(size, 'east', height),
        south: planWall(size, 'south', height),
        west: planWall(size, 'west', height),
        vestibule: roundVestibuleWall(cellVestibule, [0, 0, 0], height),
      },
    })
  }

  /** Whether the position, relative to the room’s origin, lies on the floor of the room or of its vestibule, at least `margin` meters from the walls’ center lines. */
  floorContains([x, , z]: Vec3, margin = 0) {
    const [width, depth] = size
    const inRoom = Math.abs(x) <= width / 2 - margin && Math.abs(z) <= depth / 2 - margin
    const inVestibule = Math.hypot(x - vestibuleX, z - vestibuleZ) <= cellVestibule.radius - margin
    const inArch = Math.abs(x - vestibuleX) <= cellVestibule.arch.width / 2 - margin && z >= vestibuleZ && z <= northZ + margin
    return inRoom || inVestibule || inArch
  }
}
