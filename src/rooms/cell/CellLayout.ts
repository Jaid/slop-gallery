import type {RoundVestibule} from '#src/lib/gallery/roundVestibule.ts'
import type {FloorSize} from '../base/Room.ts'

import {chandelierCeiling} from '#src/lib/physics/chandelier.ts'

/** a pedestal carrying one item */
export type CellPedestal = {
  /** the middle of its foot, relative to the room’s origin */
  position: readonly [x: number, z: number]
  /** its turn about y, which faces one of its sides toward the middle of the space it stands in, or toward the arch where it stands in the middle itself */
  rotation: number
}
/** how the space beyond the north wall is laid out, by the number of items */
export type CellPlan = 'closed' | 'rotunda' | 'single'

/** edge length of the floor’s marble tiles, which run whole from wall to wall along both axes */
const tile = 0.5
/** wider than deep, the arch in the middle of its long north wall */
const size: FloorSize = [18, 14]
const height = 6
const northZ = -size[1] / 2
/** the arch through the north wall, which a door closes while the Cell has no items */
const arch = {
  width: 3,
  height: 4.2,
  profile: 'arch',
} as const satisfies RoundVestibule['arch']
/** how steeply the hall’s gabled ceiling rises from its north and south walls to the ridge along its middle, like a house’s roof */
const roofPitch = Math.PI / 6
/** how far the vestibule’s wall stands back from the north wall’s center line, which leaves a passage between them, lined like the arch */
const passage = 0.5
/** the vestibule’s round a lone item */
const vestibuleRadius = 4
/** how far apart neighboring pedestals of a rotunda stand at least, middle to middle */
const ringSpacing = 4
/** the rotunda’s pedestals stand no nearer to its middle, which keeps a broad floor between them */
const ringMinimum = 3.2
/** from the rotunda’s ring of pedestals out to its wall, room enough to walk round them */
const ringClearance = 3
/** The turn about y that faces a pedestal at `from` toward `to`. */
const facing = ([x, z]: readonly [number, number], [toX, toZ]: readonly [number, number]) => Math.atan2(toX - x, toZ - z) + 0
const round = (value: number) => Math.round(value * 1e9) / 1e9 + 0
/** The plan for as many items. */
function planFor(itemCount: number): CellPlan {
  if (itemCount < 2) {
    return itemCount ? 'single' : 'closed'
  }
  return 'rotunda'
}

/**
 * The Cell’s floor plan, its size fixed, and what lies beyond its north wall, which follows the number of items it holds, each on a pedestal of its own:
 *
 * - none: the arch through the north wall stays shut by a door
 * - one: a round vestibule with the pedestal in its middle
 * - two and more: a rotunda, as large as a ring of their pedestals round its middle takes, the ring open toward the arch
 *
 * Whenever the arch opens, a short passage leads on from it to the round room, its floor as level as the hall’s.
 */
export default class CellLayout {
  /** the arch through the north wall and the one through the round room’s wall, as it opens straight across */
  readonly arch = arch
  /** how much higher the Cell’s chandelier hangs than from the ceiling it is made for, so it hangs right under the Cell’s */
  readonly chandelierLift = round(height - chandelierCeiling)
  /** edge length of the floor’s marble tiles, which run whole from wall to wall */
  readonly floorTile = tile
  /** how high the ceilings hang at the walls, the middle of their slabs: over the round room all over and over the hall where its ceiling rises from the walls to its ridge */
  readonly height = height
  /** the z of the north wall’s center line, relative to the room’s origin */
  readonly northZ = northZ
  /** how far north of the north wall’s center line the passage through it ends, where the round room’s wall touches it */
  readonly passage = passage
  /** a pedestal for every item, in their order */
  readonly pedestals: ReadonlyArray<CellPedestal>
  readonly plan: CellPlan
  /** how high the hall’s ceiling rises at its ridge, along the middle of its slabs */
  readonly ridgeHeight = round(height + size[1] / 2 * Math.tan(roofPitch))
  /** how steeply the hall’s ceiling rises from its north and south walls to its ridge, in radians */
  readonly roofPitch = roofPitch
  readonly size = size
  /** the round room beyond the north wall’s arch, a vestibule or a rotunda, or undefined while a door closes the arch */
  readonly vestibule: RoundVestibule | undefined

  constructor(readonly itemCount: number) {
    if (!Number.isSafeInteger(itemCount) || itemCount < 0) {
      throw new RangeError(`The Cell holds a whole number of items, not ${itemCount}.`)
    }
    this.plan = planFor(itemCount)
    if (this.plan === 'closed') {
      this.vestibule = undefined
      this.pedestals = []
      return
    }
    if (this.plan === 'single') {
      const center = [0, round(northZ - passage - vestibuleRadius)] as const
      this.vestibule = this.roundRoom(center, vestibuleRadius)
      this.pedestals = [{
        position: center,
        rotation: 0,
      }]
      return
    }
    // As many slots round the ring as items and one more, the one in front of the arch left free to walk in by.
    const slots = itemCount + 1
    const ring = Math.max(ringMinimum, ringSpacing / 2 / Math.sin(Math.PI / slots))
    const radius = ring + ringClearance
    const center = [0, round(northZ - passage - radius)] as const
    this.vestibule = this.roundRoom(center, radius)
    this.pedestals = Array.from({length: itemCount}, (_, index) => {
      const angle = Math.PI / 2 + (index + 1) * Math.PI * 2 / slots
      const position = [round(center[0] + Math.cos(angle) * ring), round(center[1] + Math.sin(angle) * ring)] as const
      return {
        position,
        rotation: facing(position, center),
      }
    })
  }

  /** How high the ceiling hangs over the point of the floor plan, relative to the room’s origin, along the middle of its slab: rising from the hall’s north and south walls to its ridge, and level over the passage and the round room. */
  ceilingAt(x: number, z: number) {
    const [width, depth] = size
    if (Math.abs(x) > width / 2 || Math.abs(z) > depth / 2) {
      return height
    }
    return round(height + (depth / 2 - Math.abs(z)) * Math.tan(roofPitch))
  }

  /** The round room round the center, its one arch facing the north wall’s across the passage. */
  private roundRoom(center: readonly [number, number], radius: number): RoundVestibule {
    return {
      center,
      radius,
      arch,
      arches: [{
        name: 'cell',
        angle: Math.PI / 2,
      }],
    }
  }
}
