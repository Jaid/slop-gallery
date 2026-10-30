import type {KnotEntry} from 'knot-materials'
import type {Vec3} from 'math'

import {knots} from 'knot-materials'
import {knotSign} from 'knot-materials/signs.ts'

import {environmentPick, environmentWeightedPick} from '#src/lib/environmentSeed.ts'
import oculusBalcony from '#src/lib/gallery/oculusBalcony.ts'
import oculusTower from '#src/lib/gallery/oculusTower.ts'
import exhibitionKnots, {exhibitionRarityChances} from '#src/rooms/exhibition/knots.ts'
import salonKnot from '#src/rooms/salon/knot.ts'

const deckY = oculusTower.floorY + oculusTower.height
/** where the deck ends toward the balcony, due south of the tower’s axis */
const deckSouthZ = oculusTower.z + oculusTower.radius
const balconyNorthZ = oculusBalcony.position[2] - oculusBalcony.size[2] / 2

/** where the Oculus shows its Knot in the museum’s meters: floating over the drop between the tower’s deck and the balcony, halfway across, at the eye level of someone on the deck */
export const oculusKnotPosition: Vec3 = [oculusTower.x, deckY + 1.5, (deckSouthZ + balconyNorthZ) / 2]
/** its nameplate on the deck, at the deck’s south rim behind the rails, facing north to whoever looks out at the Knot from the deck */
export const oculusKnotSign = {
  position: [oculusTower.x, deckY + knotSign.elevation, deckSouthZ - 0.55] as Vec3,
  rotation: Math.PI,
}
/** It continues the numbering of the Exhibition’s six, whose tunnel leads into the Oculus. */
export const oculusKnotLabel = '#07'

/** The Knot the Oculus shows in the environment of `seed`: its rarity rolled like an Exhibition Knot’s, then one of that rarity which neither the Salon nor the Exhibition shows. */
export default function oculusKnot(seed: number): KnotEntry {
  const taken = new Set([salonKnot(seed).id, ...exhibitionKnots(seed).map(knot => knot.entry.id)])
  const rarity = environmentWeightedPick(seed, 'oculus-rarity', exhibitionRarityChances)
  return environmentPick(seed, 'oculus-knot', knots.filter(knot => knot.rarity === rarity && !taken.has(knot.id)))
}
