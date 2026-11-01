import type {RoundVestibule} from '#src/lib/gallery/roundVestibule.ts'
import type {FloorSize} from '../base/Room.ts'

import {wallFace} from '#src/lib/gallery/architectureDimensions.ts'
import easedRamp, {easedRampKnots} from '#src/lib/gallery/easedRamp.ts'
import {chandelierCeiling} from '#src/lib/physics/chandelier.ts'

/** a round space of the Cell beyond its north wall */
export type CellSpace = RoundVestibule & {
  /** its wall’s id within the room, which the arch opening onto it from the vestibule is named after */
  name: string
}
/** a pedestal carrying one item */
export type CellPedestal = {
  /** the middle of its foot, relative to the room’s origin */
  position: readonly [x: number, z: number]
  /** its turn about y, which faces one of its sides toward the middle of the space it stands in, or toward the arch where it stands in the middle itself */
  rotation: number
}
/** how the space beyond the north wall is laid out, by the number of items */
export type CellPlan = 'alcoves' | 'closed' | 'rotunda' | 'single'

/** edge length of the floor’s marble tiles, which run whole from wall to wall along both axes */
const tile = 0.5
/** wider than deep, the arch in the middle of its long north wall */
const size: FloorSize = [18, 14]
const height = 6
const northZ = -size[1] / 2
/** the arch through the north wall, which a door closes while the Cell has no items, and every arch beyond it, as high over the hall’s floor */
const arch = {
  width: 3,
  height: 4.2,
  profile: 'arch',
} as const satisfies RoundVestibule['arch']
/** how much lower the floors of the round spaces lie than the hall’s, down a ramp in the passage between them */
const sink = 0.15
/** how steeply the passage’s ramp falls at most, halfway down, like the Fortress’ */
const steepest = 0.25
/** how far apart the knots of the passage’s ramp lie at most, closer than the Fortress’ long ramps’, so the tiles running down it bend smoothly */
const rampKnotSpacing = 0.08
/** the vestibule’s, round a lone item or the arches into the alcoves */
const vestibuleRadius = 4
/** an alcove’s, which leaves 2 m to walk round its pedestal */
const alcoveRadius = 2.6
/** where the alcoves open round the vestibule’s center, from world x toward world z: fanned out across from the arch, from the left to the right as seen through it */
const alcoveAngles: Partial<Record<number, ReadonlyArray<number>>> = {
  2: [-0.75 * Math.PI, -0.25 * Math.PI],
  3: [-5 / 6 * Math.PI, -0.5 * Math.PI, -Math.PI / 6],
}
/** how far apart neighboring pedestals of a rotunda stand at least, middle to middle */
const ringSpacing = 2.6
/** the rotunda’s pedestals stand no nearer to its middle, which keeps room to walk round it */
const ringMinimum = 2.4
/** from the rotunda’s ring of pedestals out to its wall, room enough to walk round them */
const ringClearance = 2.4
/** The turn about y that faces a pedestal at `from` toward `to`. */
const facing = ([x, z]: readonly [number, number], [toX, toZ]: readonly [number, number]) => Math.atan2(toX - x, toZ - z) + 0
const round = (value: number) => Math.round(value * 1e9) / 1e9 + 0
/** the passage’s ramp, from the north wall’s face on to the round spaces’ floor: an eased ramp falls 1.5 times as steeply halfway as a straight one would */
const rampLength = round(1.5 * sink / steepest)
/** how far the vestibule’s wall stands back from the north wall’s center line, which leaves a passage between them as deep as the north wall’s face and the ramp */
const passage = round(wallFace + rampLength)
/** The plan for as many items. */
function planFor(itemCount: number): CellPlan {
  if (itemCount < 2) {
    return itemCount ? 'single' : 'closed'
  }
  return alcoveAngles[itemCount] ? 'alcoves' : 'rotunda'
}

/**
 * The Cell’s floor plan, its size fixed, and what lies beyond its north wall, which follows the number of items it holds, each on a pedestal of its own:
 *
 * - none: the arch through the north wall stays shut by a door
 * - one: a round vestibule with the pedestal in its middle
 * - two or three: the vestibule as a hub with an arch into a small round alcove for each, fanned out across from the arch
 * - four and more: the vestibule as a rotunda, as large as a ring of their pedestals round its middle takes, the ring open toward the arch
 *
 * Whenever the arch opens, a short passage leads on from it to the vestibule, its floor easing down a ramp to the round spaces’ sunken floors.
 */
export default class CellLayout {
  /** the small round rooms off the vestibule, one for each item, when there are two or three */
  readonly alcoves: ReadonlyArray<CellSpace>
  /** the arch through the north wall, as it opens straight across, whose crown every arch beyond it shares */
  readonly arch = arch
  /** how much higher the Cell’s chandelier hangs than from the ceiling it is made for, so it hangs right under the Cell’s */
  readonly chandelierLift = round(height - chandelierCeiling)
  /** edge length of the floor’s marble tiles, which run whole from wall to wall */
  readonly floorTile = tile
  /** how high the ceilings hang, over the Cell and everything beyond it alike */
  readonly height = height
  /** the z of the north wall’s center line, relative to the room’s origin */
  readonly northZ = northZ
  /** how far north of the north wall’s center line the passage through it ends, where the vestibule’s wall touches it */
  readonly passage = passage
  /** a pedestal for every item, in their order */
  readonly pedestals: ReadonlyArray<CellPedestal>
  readonly plan: CellPlan
  /** where the knots of the passage’s ramp lie, in meters north of the north wall’s face, from its head to its foot; its eased profile runs straight from knot to knot */
  readonly rampKnots = easedRampKnots(rampLength, rampKnotSpacing)
  /** how long the passage’s ramp runs north from the north wall’s face down to the round spaces’ floor */
  readonly rampLength = rampLength
  /** how much lower the round spaces’ floors lie than the hall’s */
  readonly sink = sink
  readonly size = size
  /** the round room beyond the north wall’s arch, or undefined while a door closes it */
  readonly vestibule: CellSpace | undefined

  constructor(readonly itemCount: number) {
    if (!Number.isSafeInteger(itemCount) || itemCount < 0) {
      throw new RangeError(`The Cell holds a whole number of items, not ${itemCount}.`)
    }
    this.plan = planFor(itemCount)
    if (this.plan === 'closed') {
      this.vestibule = undefined
      this.alcoves = []
      this.pedestals = []
      return
    }
    if (this.plan === 'rotunda') {
      // As many slots round the ring as items and one more, the one in front of the arch left free to walk in by.
      const slots = itemCount + 1
      const ring = Math.max(ringMinimum, ringSpacing / 2 / Math.sin(Math.PI / slots))
      const radius = ring + ringClearance
      const center = [0, round(northZ - passage - radius)] as const
      this.vestibule = this.space('vestibule', center, radius, [['cell', Math.PI / 2]])
      this.alcoves = []
      this.pedestals = Array.from({length: itemCount}, (_, index) => {
        const angle = Math.PI / 2 + (index + 1) * Math.PI * 2 / slots
        const position = [round(center[0] + Math.cos(angle) * ring), round(center[1] + Math.sin(angle) * ring)] as const
        return {
          position,
          rotation: facing(position, center),
        }
      })
      return
    }
    const center = [0, round(northZ - passage - vestibuleRadius)] as const
    if (this.plan === 'single') {
      this.vestibule = this.space('vestibule', center, vestibuleRadius, [['cell', Math.PI / 2]])
      this.alcoves = []
      this.pedestals = [{
        position: center,
        rotation: 0,
      }]
      return
    }
    const angles = alcoveAngles[itemCount]!
    const names = angles.map((_, index) => `alcove_${index}`)
    this.vestibule = this.space('vestibule', center, vestibuleRadius, [['cell', Math.PI / 2], ...angles.map((angle, index) => [names[index], angle] as const)])
    // Each alcove’s wall touches the vestibule’s back to back where the arch between them opens.
    this.alcoves = angles.map((angle, index) => {
      const distance = vestibuleRadius + alcoveRadius
      const middle = [round(center[0] + Math.cos(angle) * distance), round(center[1] + Math.sin(angle) * distance)] as const
      return this.space(names[index], middle, alcoveRadius, [['vestibule', angle + Math.PI]])
    })
    this.pedestals = this.alcoves.map(alcove => ({
      position: alcove.center,
      rotation: facing(alcove.center, center),
    }))
  }

  /** the vestibule and its alcoves: every round space beyond the north wall, none while it is closed */
  get spaces(): ReadonlyArray<CellSpace> {
    return this.vestibule ? [this.vestibule, ...this.alcoves] : []
  }

  /** How high the floor lies at `z`, relative to the room’s origin, anywhere on the floor plan: level in the hall, easing down the passage’s ramp from the north wall’s face, and sunk by {@link sink} in the round spaces beyond it. */
  floorAt(z: number) {
    if (!this.vestibule) {
      return 0
    }
    return round(-sink * easedRamp(northZ - wallFace - z, rampLength, rampKnotSpacing))
  }

  private space(name: string, center: readonly [number, number], radius: number, arches: ReadonlyArray<readonly [name: string, angle: number]>): CellSpace {
    return {
      name,
      center,
      radius,
      // From the sunken floor up to the same crown as the arch through the north wall.
      arch: {
        ...arch,
        height: round(arch.height + sink),
      },
      arches: arches.map(([archName, angle]) => ({
        name: archName,
        angle,
      })),
    }
  }
}
