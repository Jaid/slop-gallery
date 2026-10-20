import type {BufferGeometry} from 'three/webgpu'

import {CatmullRomCurve3, CylinderGeometry, LatheGeometry, OctahedronGeometry, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'

/** One tier of candle arms around the chandelier’s column. */
type Tier = {
  arms: number
  /** reach of the candle cups from the column */
  reach: number
  /** height of the cups above the root */
  rise: number
  /** how far the arm sags below its root before it rises to the cup */
  sag: number
  /** height of the arms’ root on the column */
  y: number
}

/**
 * The Lobby’s great gilt chandelier, in meters with its origin at the top of its column and hanging down along −y.
 *
 * A long rod with knops rises from the column to a canopy at the ceiling. Two tiers of curving arms carry candles in drip cups, sixteen below
 * and eight above, ringed by gilt hoops hung with crystal drops; a pinecone finial closes the column underneath.
 */
export const lobbyChandelier = {
  columnHeight: 1.9,
  tiers: [
    {
      arms: 16,
      y: -1.45,
      reach: 1.55,
      sag: 0.45,
      rise: 0.25,
    },
    {
      arms: 8,
      y: -0.65,
      reach: 0.95,
      sag: 0.32,
      rise: 0.22,
    },
  ] satisfies Array<Tier>,
  candle: {
    radius: 0.032,
    height: 0.22,
  },
  /** crystal drops hanging from the hoops, per tier */
  drops: [32, 16],
  /** just below the crystal ball under the finial, so the fixture never shadows its own light */
  lightY: -2.75,
} as const

/** Lowest point of the chandelier below the top of its column: the crystal ball under the finial. */
export const lobbyChandelierBottom = -(lobbyChandelier.columnHeight + 0.58)

/** A turned part, from a profile listed top to bottom as [radius, y]; the lathe wants it bottom to top to face outward. */
export const turned = (profile: ReadonlyArray<readonly [number, number]>, segments: number) => new LatheGeometry(profile.toReversed().map(([radius, y]) => new Vector2(radius, y)), segments)

/** Gilt metal, candles, flames and crystal of one chandelier, merged per material. */
export default class LobbyChandelierGeometry {
  readonly candles: BufferGeometry
  readonly crystal: BufferGeometry
  readonly flames: BufferGeometry
  readonly gilt: BufferGeometry

  /** `rod` is the distance from the top of the column up to the ceiling, where the canopy sits. */
  constructor(rod: number) {
    if (!(rod > 0.3)) {
      throw new RangeError('A chandelier needs a rod longer than its canopy.')
    }
    const {candle, columnHeight, drops, tiers} = lobbyChandelier
    const gilt: Array<BufferGeometry> = []
    const candles: Array<BufferGeometry> = []
    const flames: Array<BufferGeometry> = []
    const crystal: Array<BufferGeometry> = []
    const canopy = turned([[0, 0], [0.42, 0], [0.38, -0.06], [0.2, -0.16], [0.08, -0.2], [0, -0.22]], 32)
    gilt.push(canopy.translate(0, rod, 0))
    const stem = new CylinderGeometry(0.028, 0.028, rod - 0.2, 10)
    gilt.push(stem.translate(0, (rod - 0.2) / 2, 0))
    // Knops break up the long rod, a little closer together toward the fixture.
    for (let i = 1; i * i * 0.35 < rod - 0.5; i++) {
      const knop = new SphereGeometry(0.06, 12, 8)
      gilt.push(knop.scale(1, 0.8, 1).translate(0, i * i * 0.35, 0))
    }
    // A turned baluster: knops and collars along a column that swells into a vase above the lower tier.
    const profile = [
      [0, 0],
      [0.09, 0],
      [0.11, -0.05],
      [0.06, -0.12],
      [0.06, -0.3],
      [0.13, -0.38],
      [0.06, -0.46],
      [0.07, -0.62],
      [0.16, -0.74],
      [0.18, -0.82],
      [0.1, -0.9],
      [0.08, -1.1],
      [0.2, -1.3],
      [0.26, -1.42],
      [0.22, -1.52],
      [0.12, -1.58],
      [0.1, -1.7],
      [0.16, -1.8],
      [0.1, -columnHeight],
      [0, -columnHeight],
    ] as const
    const column = turned(profile, 32)
    gilt.push(column)
    const finial = turned([[0, 0], [0.1, 0], [0.13, -0.1], [0.09, -0.25], [0.04, -0.38], [0, -0.45]], 24)
    gilt.push(finial.translate(0, -columnHeight, 0))
    for (const [index, tier] of tiers.entries()) {
      // Arms leave the column, dip into a swan neck and rise to their cup.
      const curve = new CatmullRomCurve3([
        new Vector3(0.12, 0, 0),
        new Vector3(tier.reach * 0.35, -tier.sag * 0.8, 0),
        new Vector3(tier.reach * 0.7, -tier.sag, 0),
        new Vector3(tier.reach * 0.95, -tier.sag * 0.4, 0),
        new Vector3(tier.reach, tier.rise - 0.05, 0),
      ])
      const hoopY = tier.y - tier.sag * 0.95
      const hoopRadius = tier.reach * 0.68
      for (let i = 0; i < tier.arms; i++) {
        const angle = (i + index * 0.5) * Math.PI * 2 / tier.arms
        const arm = new TubeGeometry(curve, 24, 0.024, 8, false)
        gilt.push(arm.translate(0, tier.y, 0).rotateY(angle))
        const cup = new LatheGeometry([new Vector2(0, -0.05), new Vector2(0.04, -0.05), new Vector2(0.11, 0.02), new Vector2(0.12, 0.03), new Vector2(0.03, 0.01), new Vector2(0, 0.01)], 16)
        gilt.push(cup.translate(tier.reach, tier.y + tier.rise, 0).rotateY(angle))
        const wax = new CylinderGeometry(candle.radius, candle.radius * 1.12, candle.height, 10)
        candles.push(wax.translate(tier.reach, tier.y + tier.rise + 0.01 + candle.height / 2, 0).rotateY(angle))
        const flame = new SphereGeometry(0.045, 10, 6)
        flames.push(flame.scale(0.75, 1.6, 0.75).translate(tier.reach, tier.y + tier.rise + candle.height + 0.08, 0).rotateY(angle))
      }
      const hoop = new TorusGeometry(hoopRadius, 0.02, 8, 64)
      gilt.push(hoop.rotateX(Math.PI / 2).translate(0, hoopY, 0))
      // Crystal drops hang in a fringe from the hoop: a short chain bead, then a long faceted pendeloque.
      for (let i = 0; i < drops[index]; i++) {
        const angle = (i + 0.5) * Math.PI * 2 / drops[index]
        const length = i % 2 ? 0.13 : 0.19
        const bead = new OctahedronGeometry(0.022)
        crystal.push(bead.translate(hoopRadius, hoopY - 0.05, 0).rotateY(angle))
        const pendant = new OctahedronGeometry(0.035)
        crystal.push(pendant.scale(1, length / 0.07, 1).translate(hoopRadius, hoopY - 0.09 - length / 2, 0).rotateY(angle))
      }
    }
    // A big crystal ball under the lower tier catches the light from every candle.
    const ball = new SphereGeometry(0.12, 12, 8)
    crystal.push(ball.translate(0, -columnHeight - 0.46, 0))
    this.gilt = mergeParts(gilt)
    this.candles = mergeParts(candles)
    this.flames = mergeParts(flames)
    this.crystal = mergeParts(crystal)
  }

  dispose() {
    for (const geometry of [this.candles, this.crystal, this.flames, this.gilt]) {
      geometry.dispose()
    }
  }
}
