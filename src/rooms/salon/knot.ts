import type {ShowcasedKnot} from '#src/lib/gallery/showcasedKnots.ts'
import type {Rarity} from 'knot-materials'
import type {Vec3} from 'math'

import {common, ethereal, knots, prime, rare} from 'knot-materials'
import {knotSign} from 'knot-materials/signs.ts'

import {environmentPick, environmentWeightedPick} from '#src/lib/environmentSeed.ts'
import {pedestalHeight} from '#src/lib/gallery/PedestalGeometry.ts'
import {salonBench, salonPedestal} from '#src/lib/gallery/salon.ts'
import {knotStandingHeight, standingKnotSink} from '#src/lib/physics/standingKnot.ts'

/** how likely each rarity is for the Salon’s Knot; the Knot is then picked among the rarity’s */
export const salonKnotRarityChances = [
  [common, 0.4],
  [rare, 0.3],
  [prime, 0.25],
  [ethereal, 0.05],
] as const satisfies ReadonlyArray<readonly [Rarity, number]>

/** how tall the Salon’s Knot stands on its pedestal, in meters */
export const salonKnotHeight = 1

/** the Knots that stand at the Salon’s size without sinking visibly into the pedestal: those whose shader pushes their surface out no further than a standing Knot may sink */
export const salonKnots = knots.filter(knot => (knot.displacement ?? 0) * salonKnotHeight / knotStandingHeight <= standingKnotSink)

const [signX, signZ] = [17, -23]
/** the Knot’s nameplate on its stand, out on the floor between the pedestal and the ottoman, east of the room’s axis, facing the ottoman */
export const salonKnotSign = {
  position: [signX, knotSign.elevation, signZ] as Vec3,
  // Facing +z at no rotation, turned toward the ottoman’s middle.
  rotation: Math.atan2(salonBench.position[0] - signX, salonBench.position[2] - signZ),
}

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
