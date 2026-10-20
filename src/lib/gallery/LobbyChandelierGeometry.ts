import type {BufferGeometry} from 'three/webgpu'

import {CylinderGeometry, QuadraticBezierCurve3, SphereGeometry, TorusGeometry, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'

/** One wheel ring of candles around the chandelier’s hub. */
type Tier = {
  count: number
  radius: number
  /** height of the arms’ root on the hub */
  root: number
  /** thickness of the wheel ring */
  tube: number
  /** height of the wheel ring */
  y: number
}

/**
 * The Lobby’s grand two-tier chandelier, in meters with its origin at the hub and hanging down along −y.
 *
 * A rod strung with turned orbs rises from a bell above the hub to a gilt boss at the ceiling. Swept arms carry two wheel rings
 * with candles in cups, eight above and twelve below, every other arm braced by a stay and a drop hanging under every cup; a
 * pendant and a finial close the hub underneath.
 */
export const lobbyChandelier = {
  tiers: [
    {
      count: 8,
      radius: 1.14,
      tube: 0.044,
      y: 0.58,
      root: 0.72,
    },
    {
      count: 12,
      radius: 1.78,
      tube: 0.054,
      y: -0.18,
      root: -0.05,
    },
  ] satisfies Array<Tier>,
} as const

/** Lowest point of the chandelier below its hub: the tip of the finial. */
export const lobbyChandelierBottom = -1.26

/** Height of the gilt boss where the rod meets the ceiling, from its center to its top. */
const mountHeight = 0.24 * 0.65

/** Gilt metal, candles and flames of one chandelier, merged per material. */
export default class LobbyChandelierGeometry {
  readonly candles: BufferGeometry
  readonly flames: BufferGeometry
  readonly gilt: BufferGeometry

  /** `rod` is the distance from the hub up to the ceiling, where the boss sits. */
  constructor(rod: number) {
    if (!(rod > 1.6)) {
      throw new RangeError('A chandelier needs a rod reaching above its crown.')
    }
    const gilt: Array<BufferGeometry> = []
    const candles: Array<BufferGeometry> = []
    const flames: Array<BufferGeometry> = []
    const mountY = rod - mountHeight
    const stemBottom = -0.55
    const stem = new CylinderGeometry(0.038, 0.038, mountY - stemBottom, 8)
    gilt.push(stem.translate(0, (mountY + stemBottom) / 2, 0))
    const boss = new SphereGeometry(0.24, 12, 8)
    gilt.push(boss.scale(1.2, 0.65, 1.2).translate(0, mountY, 0))
    const bossRing = new TorusGeometry(0.28, 0.045, 6, 18)
    gilt.push(bossRing.rotateX(Math.PI / 2).translate(0, mountY, 0))
    // Turned orbs with collars break up the long rod.
    for (const fraction of [0.22, 0.5, 0.78]) {
      const y = rod * fraction
      const orb = new SphereGeometry(0.14, 10, 8)
      gilt.push(orb.scale(1, 1.35, 1).translate(0, y, 0))
      const collar = new TorusGeometry(0.16, 0.028, 6, 14)
      gilt.push(collar.rotateX(Math.PI / 2).translate(0, y, 0))
    }
    // A bell over two baluster hubs, then a pendant and a finial underneath.
    const bell = new CylinderGeometry(0.09, 0.28, 0.26, 14)
    gilt.push(bell.translate(0, 1.15, 0))
    const upperHub = new SphereGeometry(0.24, 14, 10)
    gilt.push(upperHub.scale(1, 1.45, 1).translate(0, 0.75, 0))
    const lowerHub = new SphereGeometry(0.32, 16, 12)
    gilt.push(lowerHub.scale(1, 1.5, 1).translate(0, -0.1, 0))
    const pendant = new SphereGeometry(0.17, 12, 8)
    gilt.push(pendant.scale(1, 1.65, 1).translate(0, -0.82, 0))
    const finial = new CylinderGeometry(0.055, 0.008, 0.28, 8)
    gilt.push(finial.translate(0, lobbyChandelierBottom + 0.14, 0))
    for (const tier of lobbyChandelier.tiers) {
      const wheel = new TorusGeometry(tier.radius, tier.tube, 6, 28)
      gilt.push(wheel.rotateX(Math.PI / 2).translate(0, tier.y, 0))
      const crest = new TorusGeometry(tier.radius, tier.tube * 0.5, 5, 28)
      gilt.push(crest.rotateX(Math.PI / 2).translate(0, tier.y + 0.08, 0))
      const armCurve = new QuadraticBezierCurve3(
        new Vector3(0.2, tier.root, 0),
        new Vector3(tier.radius * 0.58, tier.y - 0.36, 0),
        new Vector3(tier.radius, tier.y + 0.04, 0),
      )
      const stayCurve = new QuadraticBezierCurve3(
        new Vector3(0.08, tier.root + 0.85, 0),
        new Vector3(tier.radius * 0.48, tier.y + 0.45, 0),
        new Vector3(tier.radius * 0.92, tier.y + 0.05, 0),
      )
      for (let i = 0; i < tier.count; i++) {
        const angle = i / tier.count * Math.PI * 2
        const arm = new TubeGeometry(armCurve, 8, 0.025, 5, false)
        gilt.push(arm.rotateY(angle))
        if (i % 2 === 0) {
          const stay = new TubeGeometry(stayCurve, 6, 0.015, 4, false)
          gilt.push(stay.rotateY(angle))
        }
        const x = Math.cos(angle) * tier.radius
        const z = -Math.sin(angle) * tier.radius
        const cup = new CylinderGeometry(0.145, 0.068, 0.085, 8)
        gilt.push(cup.translate(x, tier.y + 0.08, z))
        const drop = new SphereGeometry(0.055, 6, 4)
        gilt.push(drop.scale(0.85, 1.65, 0.85).translate(x, tier.y - 0.11, z))
        const candle = new CylinderGeometry(0.048, 0.055, 0.28, 8)
        candles.push(candle.translate(x, tier.y + 0.26, z))
        const flame = new SphereGeometry(0.075, 6, 4)
        flames.push(flame.scale(0.78, 1.55, 0.78).translate(x, tier.y + 0.47, z))
      }
    }
    this.gilt = mergeParts(gilt)
    this.candles = mergeParts(candles)
    this.flames = mergeParts(flames)
  }

  dispose() {
    for (const geometry of [this.candles, this.flames, this.gilt]) {
      geometry.dispose()
    }
  }
}
