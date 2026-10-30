import type {ShowcasedKnot} from '#src/lib/gallery/showcasedKnots.ts'
import type {KnotEntry, Rarity} from 'knot-materials'
import type {Vec3} from 'math'

import knots, {common, ethereal, prime, rare} from 'knot-materials'

import {environmentPick, environmentWeightedPick} from '#src/lib/environmentSeed.ts'
import tunnelDisplays, {tunnelDisplayWindow} from '#src/lib/gallery/tunnelDisplays.ts'
import salonKnot from '#src/rooms/salon/knot.ts'

/** how likely each rarity is for one of the Exhibition’s Knots; the Knot is then picked among the rarity’s */
export const exhibitionRarityChances = [
  [common, 0.4],
  [rare, 0.3],
  [prime, 0.25],
  [ethereal, 0.05],
] as const satisfies ReadonlyArray<readonly [Rarity, number]>

const knotsByRarity = Map.groupBy(knots, knot => knot.rarity)

/** how high the Knots float over their displays’ floors: halfway up the windows, at eye level */
export const exhibitionKnotHeight = (tunnelDisplayWindow.bottom + tunnelDisplayWindow.top) / 2

/** the pedestals under the Knots, measured up from the displays’ floors under their middles; a stone block under a metal cap with a shadow gap between them */
export const exhibitionPedestal = {
  width: 1,
  /** the block’s top */
  blockHeight: 0.5,
  revealHeight: 0.02,
  capWidth: 1.1,
  capHeight: 0.08,
  /** the cap’s top, which stays clear of the Knots’ lowest reach */
  get height() {
    return this.blockHeight + this.revealHeight + this.capHeight
  },
} as const

/** where the Exhibition shows a Knot in the museum’s meters, three in each display, each turned a sixth of a revolution on from the one before */
export const exhibitionSlots = tunnelDisplays.flatMap(display => display.exhibits).map((exhibit, index) => ({
  id: exhibit.id,
  /** the display’s floor under the Knot, where its pedestal stands */
  floor: exhibit.position,
  position: [exhibit.position[0], exhibit.position[1] + exhibitionKnotHeight, exhibit.position[2]] as Vec3,
  rotation: index * Math.PI / 3,
}))

/**
 * The Knots the Exhibition shows in the environment of `seed`, one per slot. Each slot rolls its rarity by `exhibitionRarityChances` first and then a Knot of that rarity, both with ids of its own, so the seed alone decides them.
 * No Knot shows twice, nor the Salon’s.
 */
export default function exhibitionKnots(seed: number): Array<ShowcasedKnot> {
  const taken = new Set([salonKnot(seed).id])
  return exhibitionSlots.map(slot => {
    const rarity = environmentWeightedPick(seed, `exhibition-rarity:${slot.id}`, exhibitionRarityChances)
    const pool = knotsByRarity.get(rarity)!.filter(knot => !taken.has(knot.id))
    const entry: KnotEntry = environmentPick(seed, `exhibition-knot:${slot.id}`, pool)
    taken.add(entry.id)
    return {
      entry,
      position: slot.position,
      rotation: slot.rotation,
    }
  })
}
