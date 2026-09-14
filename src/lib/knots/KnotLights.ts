import type {Vec3} from '../gallery/types.ts'
import type KnotLayout from './KnotLayout.ts'

export const knotLight = {
  size: [2.4, 0.08, 2.2] as const,
  ceilingInset: 0.16,
  minImpactMass: 3,
  minImpactEnergy: 12,
  impactCooldown: 0.55,
} as const

export type KnotLightStage = 0 | 1 | 2
export type KnotLightSlot = {
  id: string
  position: Vec3
  row: number
  slot: number
}
export type KnotLightEmissionGroup = {
  damageIndex: number | null
  firstSlot: number
  id: string
  lastSlot: number
  row: number
}

export function knotLightSlots(layout: KnotLayout, rowCount: number, ceilingHeight: number): Array<KnotLightSlot> {
  return Array.from({length: rowCount * layout.maxRowLength}, (_, index) => {
    const row = Math.floor(index / layout.maxRowLength)
    const slot = index % layout.maxRowLength
    return {
      id: `${row}:${slot}`,
      position: [layout.slotX(slot), ceilingHeight - knotLight.ceilingInset, layout.rowZ(row)],
      row,
      slot,
    }
  })
}

/** Groups contiguous healthy panes while isolating flickering panes and omitting dead panes. */
export function knotLightEmissionGroups(slots: ReadonlyArray<KnotLightSlot>, stages: ReadonlyArray<KnotLightStage>): Array<KnotLightEmissionGroup> {
  if (slots.length !== stages.length) {
    throw new RangeError('Knot light slots and damage stages must have the same length.')
  }
  const indexed = slots.map((slot, index) => ({
    index,
    slot,
    stage: stages[index],
  })).toSorted((a, b) => a.slot.row - b.slot.row || a.slot.slot - b.slot.slot)
  const groups: Array<KnotLightEmissionGroup> = []
  let healthy: {firstSlot: number
    lastSlot: number
    row: number} | null = null
  const flushHealthy = () => {
    if (!healthy) {
      return
    }
    groups.push({
      id: `healthy:${healthy.row}:${healthy.firstSlot}-${healthy.lastSlot}`,
      row: healthy.row,
      firstSlot: healthy.firstSlot,
      lastSlot: healthy.lastSlot,
      damageIndex: null,
    })
    healthy = null
  }
  for (const {index, slot, stage} of indexed) {
    if (stage === 0) {
      if (healthy?.row !== slot.row || slot.slot !== healthy.lastSlot + 1) {
        flushHealthy()
        healthy = {
          firstSlot: slot.slot,
          lastSlot: slot.slot,
          row: slot.row,
        }
      } else {
        healthy.lastSlot = slot.slot
      }
      continue
    }
    flushHealthy()
    if (stage === 1) {
      groups.push({
        id: `damaged:${slot.id}`,
        row: slot.row,
        firstSlot: slot.slot,
        lastSlot: slot.slot,
        damageIndex: index,
      })
    }
  }
  flushHealthy()
  return groups
}

export function knotLightImpactEnergy(mass: number, speed: number) {
  return Number.isFinite(mass) && Number.isFinite(speed) && mass > 0 && speed >= 0 ? mass * speed * speed / 2 : 0
}

export function isKnotLightDamageImpact(mass: number, speed: number) {
  return mass >= knotLight.minImpactMass && knotLightImpactEnergy(mass, speed) >= knotLight.minImpactEnergy
}

const fract = (value: number) => value - Math.floor(value)
const noise = (seed: number, sample: number) => fract(Math.sin((seed + 1) * 12.9898 + (sample + 1) * 78.233) * 43_758.5453)

/** Deterministic stepped noise: repeatable per pane, but deliberately erratic to the eye. */
export function knotLightFlicker(seed: number, elapsed: number) {
  const time = Math.max(0, elapsed)
  const fast = noise(seed, Math.floor(time * 37))
  const medium = noise(seed + 101, Math.floor(time * 17))
  const slow = noise(seed + 307, Math.floor(time * 7))
  if (fast < 0.1 || medium < 0.045) {
    return 0.025 + slow * 0.06
  }
  return Math.min(1, 0.18 + fast * 0.52 + medium * 0.22 + slow * 0.16)
}

export default class KnotLightDamage {
  private readonly damagedAt: Float64Array
  private readonly lastImpact: Float64Array
  private readonly stages: Uint8Array

  constructor(readonly count: number) {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new RangeError('Knot light count must be a non-negative integer.')
    }
    this.stages = new Uint8Array(count)
    this.lastImpact = new Float64Array(count).fill(Number.NEGATIVE_INFINITY)
    this.damagedAt = new Float64Array(count).fill(Number.POSITIVE_INFINITY)
  }

  hit(index: number, mass: number, speed: number, time: number) {
    this.assertIndex(index)
    if (this.stage(index) === 2 || !Number.isFinite(time) || time - this.lastImpact[index] < knotLight.impactCooldown || !isKnotLightDamageImpact(mass, speed)) {
      return false
    }
    this.lastImpact[index] = time
    if (this.stages[index] === 0) {
      this.stages[index] = 1
      this.damagedAt[index] = time
    } else {
      this.stages[index] = 2
    }
    return true
  }

  intensity(index: number, time: number) {
    const stage = this.stage(index)
    if (stage === 0) {
      return 1
    }
    if (stage === 2) {
      return 0
    }
    return knotLightFlicker(index * 811 + 17, time - this.damagedAt[index])
  }

  stage(index: number): KnotLightStage {
    this.assertIndex(index)
    return this.stages[index] as KnotLightStage
  }

  private assertIndex(index: number) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.count) {
      throw new RangeError(`Invalid Knot light index: ${index}`)
    }
  }
}
