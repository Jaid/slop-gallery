import type KnotLayout from './KnotLayout.ts'
import type {Vec3} from './types.ts'

import {clamp} from 'math'

export const knotLight = {
  size: [2.4, 0.08, 2.2] as const,
  ceilingInset: 0.16,
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

export function knotLightImpactEnergy(mass: number, speed: number) {
  return Number.isFinite(mass) && Number.isFinite(speed) && mass > 0 && speed >= 0 ? mass * speed * speed / 2 : 0
}

export function isKnotLightDamageImpact(mass: number, speed: number) {
  return knotLightImpactEnergy(mass, speed) >= knotLight.minImpactEnergy
}

const fract = (value: number) => value - Math.floor(value)
const noise = (seed: number, sample: number) => fract(Math.sin((seed + 1) * 12.9898 + (sample + 1) * 78.233) * 43_758.5453)
export type KnotLightFracture = {
  deadTriangle: readonly [readonly [number, number], readonly [number, number], readonly [number, number]]
  liveFraction: number
  normal: readonly [number, number]
  point: readonly [number, number]
}

/** Builds a line through the impact that cuts the nearest diffuser corner into one dead triangle. */
export function knotLightFracture(point: readonly [number, number], velocity: readonly [number, number], seed = 0): KnotLightFracture {
  const px = clamp(Number.isFinite(point[0]) ? point[0] : 0, -0.94, 0.94)
  const pz = clamp(Number.isFinite(point[1]) ? point[1] : 0, -0.94, 0.94)
  const vx = Number.isFinite(velocity[0]) ? velocity[0] : 0
  const vz = Number.isFinite(velocity[1]) ? velocity[1] : 0
  const chooseSign = (position: number, speed: number, sample: number) => {
    if (Math.abs(position) > 0.000001) {
      return Math.sign(position)
    }
    if (Math.abs(speed) > 0.001) {
      return Math.sign(speed)
    }
    return noise(seed, sample) < 0.5 ? -1 : 1
  }
  const cornerX = chooseSign(px, vx, 701)
  const cornerZ = chooseSign(pz, vz, 709)
  const xDistance = 1 - cornerX * px
  const zDistance = 1 - cornerZ * pz
  const minLambda = xDistance / 2
  const maxLambda = 1 - zDistance / 2
  const planarSpeed = Math.abs(vx) + Math.abs(vz)
  const velocityBias = planarSpeed > 0.001 ? (Math.abs(vz) - Math.abs(vx)) / planarSpeed * 0.16 : 0
  const jitter = (noise(seed, 719) - 0.5) * 0.16
  const lambda = clamp(0.5 + velocityBias + jitter, Math.min(minLambda, maxLambda), Math.max(minLambda, maxLambda))
  const xIntercept = xDistance / Math.max(lambda, 0.0001)
  const zIntercept = zDistance / Math.max(1 - lambda, 0.0001)
  const nx = cornerX / xIntercept
  const nz = cornerZ / zIntercept
  const length = Math.hypot(nx, nz) || 1
  const corner = [cornerX, cornerZ] as const
  const xEdge = [cornerX - cornerX * xIntercept, cornerZ] as const
  const zEdge = [cornerX, cornerZ - cornerZ * zIntercept] as const
  return {
    point: [px, pz],
    normal: [nx / length, nz / length],
    deadTriangle: [corner, xEdge, zEdge],
    liveFraction: 1 - xIntercept * zIntercept / 8,
  }
}

/** Deterministic stepped noise: repeatable per pane, but deliberately erratic to the eye. */
export function knotLightFlicker(seed: number, elapsed: number) {
  const time = Math.max(0, elapsed)
  if (time < 0.12) {
    return 1
  }
  const fast = noise(seed, Math.floor(time * 37))
  const medium = noise(seed + 101, Math.floor(time * 17))
  const slow = noise(seed + 307, Math.floor(time * 7))
  if (fast < 0.1 || medium < 0.045) {
    return 0.38 + slow * 0.12
  }
  return Math.min(1, 0.54 + fast * 0.24 + medium * 0.12 + slow * 0.1)
}

export default class KnotLightDamage {
  private readonly damagedAt: Float64Array
  private readonly lastAttack: Float64Array
  private readonly lastImpact: Float64Array
  private readonly stages: Uint8Array

  constructor(readonly count: number) {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new RangeError('Knot light count must be a non-negative integer.')
    }
    this.stages = new Uint8Array(count)
    this.lastAttack = new Float64Array(count).fill(Number.NaN)
    this.lastImpact = new Float64Array(count).fill(Number.NEGATIVE_INFINITY)
    this.damagedAt = new Float64Array(count).fill(Number.POSITIVE_INFINITY)
  }

  hit(index: number, mass: number, speed: number, time: number, attackId: number) {
    this.assertIndex(index)
    if (!Number.isSafeInteger(attackId) || attackId <= 0 || this.lastAttack[index] === attackId || this.stage(index) === 2 || !Number.isFinite(time) || time - this.lastImpact[index] < knotLight.impactCooldown || !isKnotLightDamageImpact(mass, speed)) {
      return false
    }
    this.lastAttack[index] = attackId
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
