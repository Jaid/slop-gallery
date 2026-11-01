import type {FloorSize, Lamp, RoomSpawn, RoomWall} from '../base/Room.ts'
import type CellLayout from './CellLayout.ts'
import type {Vec3} from 'math'
import type {Box3} from 'three/webgpu'

import {Geofence} from 'geofency'

import {insideRoundVestibule, roundVestibuleWall} from '#src/lib/gallery/roundVestibule.ts'
import {aimThrower} from '#src/lib/gallery/SpotlightThrowerGeometry.ts'
import {chandelierLampY} from '#src/lib/physics/chandelier.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import {planWall} from '../lib/walls.ts'
import cellBaseboard from './baseboard.ts'
import cellMap from './map.ts'
import slots from './slots.ts'

/** the light over an item: a warm white cone from each of its throwers, as wide as a pedestal’s cap where it reaches the item, its edge soft, which share the strength between them */
export const throwerSpot = {
  kind: 'spot',
  angle: 0.2,
  penumbra: 0.55,
  strength: 140,
  tint: '#fff2e0',
  range: 9,
} as const
/** the most throwers whose light casts shadows */
const maxShadowedThrowers = 4

/** The Sandbox’s one room: a sealed hall in the Arena’s marble and velvet under the Sienna’s chandelier, laid out around the middle of its floor. Beyond the arch through its north wall, its layout lays out a pedestal for every item it holds, each lit by spotlight throwers, or a door closes the arch while it holds none. */
export default class Cell extends Room {
  override readonly air: Array<Box3>
  override readonly color = '#5d242b'
  override readonly description = 'Nothing in it yet.'
  override readonly fence: Geofence
  /** edge length of the floor’s marble tiles, which run whole from wall to wall */
  readonly floorTile: number
  override readonly height: number
  override readonly id = 'cell'
  override readonly size: FloorSize
  // In front of the south wall, looking north through the arch at the items, or at the door.
  override readonly spawn: RoomSpawn = {
    position: [0, 0.04, 4.5],
    yaw: 0,
    pitch: 0,
  }

  constructor(readonly layout: CellLayout) {
    const {chandelierLift, height, size, spaces, vestibule} = layout
    const lamps: Record<string, Lamp> = {
      // The Sienna’s, below the swinging chandelier’s metalwork at rest, so the fixture can’t shadow its own source; it swings along with it.
      chandelier: {
        position: [0, chandelierLampY + chandelierLift, 0],
        strength: 45,
        tint: '#ffd36c',
        range: 15,
        decay: 1.75,
        shadow: true,
      },
    }
    // As bright on every item, however many throwers light it.
    const share = layout.pedestals.length / layout.throwers.length
    for (const [index, {ceiling, target}] of layout.throwers.entries()) {
      // From just in front of the thrower’s lens, a tight pool round the item and its pedestal’s cap.
      lamps[`thrower_${index}`] = {
        position: aimThrower(ceiling, target).source,
        target,
        ...throwerSpot,
        strength: throwerSpot.strength * share,
        // Every spot that casts a shadow costs every lit material a lights node of its own, so a rotunda’s many leave theirs out.
        shadow: layout.throwers.length <= maxShadowedThrowers ? 'heavy' : false,
      }
    }
    // The arch through the north wall opens into the vestibule, or a door that stays shut fills it.
    const opening = {
      ...layout.arch,
      u: vestibule?.center[0] ?? 0,
    }
    const walls: Record<string, RoomWall> = {
      // Four plain walls, which artworks may hang on.
      north: planWall(size, 'north', height, {
        baseboardSection: cellBaseboard,
        holes: vestibule ? {vestibule: opening} : {door: opening},
      }),
      east: planWall(size, 'east', height, {baseboardSection: cellBaseboard}),
      south: planWall(size, 'south', height, {baseboardSection: cellBaseboard}),
      west: planWall(size, 'west', height, {baseboardSection: cellBaseboard}),
      ...Object.fromEntries(spaces.map(space => [space.name, {
        ...roundVestibuleWall(space, [0, 0, 0], height),
        baseboardSection: cellBaseboard,
      }])),
    }
    super({
      title: 'Cell',
      map: cellMap(layout),
      slots,
      lamps,
      walls,
    })
    this.floorTile = layout.floorTile
    this.height = height
    this.size = size
    this.air = [
      floorBox(size, 0, height),
      ...spaces.map(space => floorBox([space.radius * 2, space.radius * 2], 0, height, space.center)),
    ]
    // Its whole floor plan and those of the spaces beyond its north wall at every height, as they are all there is.
    this.fence = new Geofence(this.air.map(box => footprint([box])))
  }

  /** Whether the position, relative to the room’s origin, lies on the floor of the room or of a space beyond its north wall, at least `margin` meters from the walls’ center lines. */
  floorContains([x, , z]: Vec3, margin = 0) {
    const [width, depth] = this.layout.size
    const inRoom = Math.abs(x) <= width / 2 - margin && Math.abs(z) <= depth / 2 - margin
    return inRoom || this.layout.spaces.some(space => insideRoundVestibule(space, x, z, margin))
  }
}
