import type {FloorSize, Lamp, RoomSpawn, RoomWall} from '../base/Room.ts'
import type CellLayout from './CellLayout.ts'
import type {Vec3} from 'math'
import type {Box3} from 'three/webgpu'

import {Geofence} from 'geofency'

import {cellLedY} from '#src/lib/gallery/CellCeilingGeometry.ts'
import {insideRoundVestibule, roundVestibuleWall} from '#src/lib/gallery/roundVestibule.ts'
import {chandelierLampY} from '#src/lib/physics/chandelier.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import footprint from '../lib/footprint.ts'
import {planWall} from '../lib/walls.ts'
import cellBaseboard from './baseboard.ts'
import cellMap from './map.ts'
import slots from './slots.ts'

/** the lamp under the LED panel in the middle of the vestibule’s ceiling, like the Banquet’s under each of its panes: a white wash without a shadow, fading gently, its light this far under the panel */
export const cellLed = {
  strength: 36,
  tint: '#eee3ff',
  decay: 1.5,
  drop: 0.32,
} as const
/** a light from no visible source in each alcove, high over its item, which lights it without a shadow */
export const alcoveLight = {
  strength: 16,
  tint: '#eee3ff',
  range: 6,
  decay: 1.5,
  /** how far under the ceiling it shines from */
  drop: 1.4,
} as const

/** The Sandbox’s one room: a sealed hall with the Arena’s marble underfoot, papered like the Sienna under the Sienna’s chandelier, laid out around the middle of its floor. Beyond the arch through its north wall, a short passage ramps down to the round spaces where its layout lays out a pedestal for every item it holds, upholstered in the Arena’s velvet, lit by an LED panel in the vestibule’s ceiling and a light in each alcove, or a door closes the arch while it holds none. */
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
    const {chandelierLift, height, northZ, passage, sink, size, spaces, vestibule} = layout
    const lamps: Record<string, Lamp> = {
      // The Sienna’s, below the swinging chandelier’s metalwork at rest, so the fixture can’t shadow its own source; it swings along with it.
      chandelier: {
        position: [0, chandelierLampY + chandelierLift, 0],
        strength: 50,
        tint: '#ffedc4',
        range: 25,
        decay: 1.5,
        shadow: true,
      },
    }
    if (vestibule) {
      const [x, z] = vestibule.center
      lamps.led = {
        position: [x, cellLedY(height) - cellLed.drop, z],
        strength: cellLed.strength,
        tint: cellLed.tint,
        // Across the whole vestibule, however large a rotunda grows.
        range: Math.max(8, vestibule.radius * 2),
        decay: cellLed.decay,
      }
    }
    for (const [index, {center: [x, z]}] of layout.alcoves.entries()) {
      const {drop, ...light} = alcoveLight
      lamps[`alcove_${index}_light`] = {
        position: [x, height - drop, z],
        ...light,
      }
    }
    // The arch through the north wall opens into the vestibule, or a door that stays shut fills it.
    const opening = {
      ...layout.arch,
      u: vestibule?.center[0] ?? 0,
    }
    const walls: Record<string, RoomWall> = {
      // Four plain walls, which artworks may hang on, with the Sienna’s tall baseboard.
      north: planWall(size, 'north', height, {holes: vestibule ? {vestibule: opening} : {door: opening}}),
      east: planWall(size, 'east', height),
      south: planWall(size, 'south', height),
      west: planWall(size, 'west', height),
      // The round spaces’ velvet walls stand on their sunken floors, up to the same ceiling, and keep the Arena’s low molded baseboard in black lacquer.
      ...Object.fromEntries(spaces.map(space => {
        const {center: [x, , z], ...wall} = roundVestibuleWall(space, [0, 0, 0], height + sink)
        return [space.name, {
          ...wall,
          center: [x, -sink, z],
          baseboardSection: cellBaseboard,
        }]
      })),
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
      ...vestibule ? [floorBox([layout.arch.width, passage], -sink, height + sink, [vestibule.center[0], northZ - passage / 2])] : [],
      ...spaces.map(space => floorBox([space.radius * 2, space.radius * 2], -sink, height + sink, space.center)),
    ]
    // Its whole floor plan and those of the spaces beyond its north wall at every height, as they are all there is.
    this.fence = new Geofence(this.air.map(box => footprint([box])))
  }

  /** Whether the position, relative to the room’s origin, lies on the floor of the room, of the passage through its north wall or of a space beyond it, at least `margin` meters from the walls’ center lines. */
  floorContains([x, , z]: Vec3, margin = 0) {
    const {arch, northZ, passage, size: [width, depth], spaces, vestibule} = this.layout
    const inRoom = Math.abs(x) <= width / 2 - margin && Math.abs(z) <= depth / 2 - margin
    // On through the north wall’s center line into the room and past the plane where the vestibule’s wall touches the passage, overlapping both.
    const inPassage = vestibule !== undefined && Math.abs(x - vestibule.center[0]) <= arch.width / 2 - margin && z <= northZ + margin && z >= northZ - passage - margin
    return inRoom || inPassage || spaces.some(space => insideRoundVestibule(space, x, z, margin))
  }

  /** How high the floor lies under the position, relative to the room’s origin, anywhere on its floor plan. */
  floorHeight([, , z]: Vec3) {
    return this.layout.floorAt(z)
  }
}
