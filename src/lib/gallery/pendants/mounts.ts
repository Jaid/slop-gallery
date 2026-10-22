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
/** The timber corridor’s spans are much longer, so its lanterns hang about 7 m apart instead, an odd count down its long run so one hangs at its center. */
export const corridorLightSpacing = 7
/** Light height above the tread it hangs over. */
export const stairLightHeight = 2.5
/** The flight’s one light, over its middle tread. */
export const stairLightSteps = [13] as const
/** how far a light may slide to reach a timber rib: half the most the ribs are apart */
export const ribSearch = 0.7
/** A rib is barely wider than a canopy, so the search for one goes in 1 cm steps not to skip over it. */
const ribStep = 0.01

/**
 * Evenly spaced lights along every span, hung from the vault, timber lining or the flat roof slabs over the elbows. Given timber
 * `ribs`, each light hangs from the nearest one instead where one is in reach.
 */
export function passagePendantMounts(passage: Passage, surfaces: ReadonlyArray<BufferGeometry>, spacing = passageLightSpacing, ribs?: BufferGeometry): Array<PendantMount> {
  const probe = new CeilingProbe(surfaces, [
    {
      y: passage.floorY + passage.height,
      rectangles: passage.floors,
    },
  ])
  const ribProbe = ribs && new CeilingProbe([ribs])
  return passage.spans.flatMap(({start, end}, span) => {
    const count = Math.max(1, Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / spacing))
    return Array.from({length: count}, (_, i) => {
      const t = (i + 0.5) / count
      const light: Vec3 = [start[0] + (end[0] - start[0]) * t, passage.floorY + passageLightHeight, start[1] + (end[1] - start[1]) * t]
      const along: Vec3 = [end[0] - start[0], 0, end[1] - start[1]]
      return ribProbe?.mount(light, along, ribSearch, ribStep) ?? mountOrThrow(probe, light, along, `${passage.id} span ${span}`)
    })
  })
}

/** Lights over a few treads, each hung from the nearest of the timber ribs under the flight’s sloped ceiling. */
export function stairPendantMounts(stairs: StairFlight, ribs: BufferGeometry, steps: ReadonlyArray<number> = stairLightSteps): Array<PendantMount> {
  const probe = new CeilingProbe([ribs])
  const along: Vec3 = [0, 0, 0]
  along[stairs.axis] = 1
  return steps.map(step => {
    const block = stairs.blocks.at(step)
    if (!block) {
      throw new RangeError(`Stair flight ${stairs.id} has no step ${step}.`)
    }
    return mountOrThrow(probe, [block.position[0], block.top + stairLightHeight, block.position[2]], along, `${stairs.id} step ${step}`, ribSearch, ribStep)
  })
}

function mountOrThrow(probe: CeilingProbe, light: Vec3, along: Vec3, label: string, search?: number, step?: number) {
  const mount = probe.mount(light, along, search, step)
  if (!mount) {
    throw new RangeError(`No ceiling area near ${label} is wide enough to hang a pendant from.`)
  }
  return mount
}
