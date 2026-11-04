import type {ShowcasedKnot} from '#src/lib/gallery/showcasedKnots.ts'
import type {Rarity} from 'knot-materials'

import {common, ethereal, knots, prime, rare} from 'knot-materials'

import {environmentPick, environmentWeightedPick} from '#src/lib/environmentSeed.ts'
import {pedestalHeight} from '#src/lib/gallery/PedestalGeometry.ts'
import {salonPedestal} from '#src/lib/gallery/salon.ts'
import {knotStandingHeight, standingKnotSkin} from '#src/lib/physics/standingKnot.ts'

/** how likely each rarity is for the Salon’s Knot; the Knot is then picked among the rarity’s */
export const salonKnotRarityChances = [
  [common, 0.4],
  [rare, 0.3],
  [prime, 0.25],
  [ethereal, 0.05],
] as const satisfies ReadonlyArray<readonly [Rarity, number]>

/** how tall the Salon’s Knot stands on its pedestal, in meters */
export const salonKnotHeight = 1

/** the Knots that keep their balance at the Salon’s size: those whose shader pushes their surface out no further than the contact skin a standing Knot allows */
export const salonKnots = knots.filter(knot => (knot.displacement ?? 0) * salonKnotHeight / knotStandingHeight <= standingKnotSkin)

const knotsByRarity = Map.groupBy(salonKnots, knot => knot.rarity)

/** The Knot standing on the Salon’s pedestal in the environment of `seed`, facing the room: its rarity is rolled by `salonKnotRarityChances` first, then a Knot of that rarity, so the seed alone decides it. */
export default function salonKnot(seed: number): ShowcasedKnot {
  const rarity = environmentWeightedPick(seed, 'salon-knot-rarity', salonKnotRarityChances)
  return {
    entry: environmentPick(seed, 'salon-knot', knotsByRarity.get(rarity)!),
    height: salonKnotHeight,
    position: [salonPedestal[0], salonPedestal[1] + pedestalHeight, salonPedestal[2]],
  }
}
