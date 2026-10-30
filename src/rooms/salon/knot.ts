import type {KnotEntry} from 'knot-materials'
import type {Vec3} from 'math'

import {knots, prime} from 'knot-materials'

import {environmentPick} from '#src/lib/environmentSeed.ts'
import salon from '#src/lib/gallery/salon.ts'

/** the Knots the Salon may show: the collection’s prime ones, rated three stars */
const primeKnots = knots.filter(knot => knot.rarity === prime)

/** where the Salon shows its Knot in the museum’s meters: on a pedestal in the north half of the room, floating over it */
export const salonKnotPosition: Vec3 = [salon.center[0], 1.9, salon.center[1] - 5]

/** The Knot the Salon shows in the environment of `seed`, one of the prime ones. */
export default function salonKnot(seed: number): KnotEntry {
  return environmentPick(seed, 'salon-knot', primeKnots)
}
