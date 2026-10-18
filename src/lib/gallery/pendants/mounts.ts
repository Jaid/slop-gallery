import type Passage from '../passages/Passage.ts'
import type StairFlight from '../stairs/StairFlight.ts'
import type {Vec3} from '../types.ts'
import type {PendantMount} from './CeilingProbe.ts'
import type {BufferGeometry} from 'three/webgpu'

import CeilingProbe from './CeilingProbe.ts'

/** Light height above a passage floor, as before the fixtures were hung. */
export const passageLightHeight = 2.8
/** At most this far between two passage lights along a span. */
export const passageLightSpacing = 5
/** The timber corridor’s spans are much longer, so its lanterns hang about 9 m apart instead. */
export const corridorLightSpacing = 9
/** Light height above the tread it hangs over. */
export const stairLightHeight = 2.5
export const stairLightSteps = [4, 13, 23] as const

/** Evenly spaced lights along every span, hung from the vault, timber lining or the flat roof slabs over the elbows. */
export function passagePendantMounts(passage: Passage, surfaces: ReadonlyArray<BufferGeometry>, spacing = passageLightSpacing): Array<PendantMount> {
  const probe = new CeilingProbe(surfaces, [
    {
      y: passage.floorY + passage.height,
      rectangles: passage.floors,
    },
  ])
  return passage.spans.flatMap(({start, end}, span) => {
    const count = Math.max(1, Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / spacing))
    return Array.from({length: count}, (_, i) => {
      const t = (i + 0.5) / count
      const light: Vec3 = [start[0] + (end[0] - start[0]) * t, passage.floorY + passageLightHeight, start[1] + (end[1] - start[1]) * t]
      return mountOrThrow(probe, light, [end[0] - start[0], 0, end[1] - start[1]], `${passage.id} span ${span}`)
    })
  })
}

/** Lights over a few treads, hung from the flight’s sloped timber ceiling. */
export function stairPendantMounts(stairs: StairFlight, surfaces: ReadonlyArray<BufferGeometry>, steps: ReadonlyArray<number> = stairLightSteps): Array<PendantMount> {
  const probe = new CeilingProbe(surfaces)
  const along: Vec3 = [0, 0, 0]
  along[stairs.axis] = 1
  return steps.map(step => {
    const block = stairs.blocks.at(step)
    if (!block) {
      throw new RangeError(`Stair flight ${stairs.id} has no step ${step}.`)
    }
    return mountOrThrow(probe, [block.position[0], block.top + stairLightHeight, block.position[2]], along, `${stairs.id} step ${step}`)
  })
}

function mountOrThrow(probe: CeilingProbe, light: Vec3, along: Vec3, label: string) {
  const mount = probe.mount(light, along)
  if (!mount) {
    throw new RangeError(`No ceiling area near ${label} is wide enough to hang a pendant from.`)
  }
  return mount
}
