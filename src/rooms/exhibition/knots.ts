import type {PedestalLobe} from '#src/lib/gallery/DisplayPedestalGeometry.ts'
import type {ShowcasedKnot} from '#src/lib/gallery/showcasedKnots.ts'
import type {KnotEntry, Rarity} from 'knot-materials'
import type {Vec3} from 'math'

import {common, ethereal, knots, prime, rare} from 'knot-materials'
import {knotSign} from 'knot-materials/signs.ts'

import {environmentPick, environmentWeightedPick} from '#src/lib/environmentSeed.ts'
import {tunnelFloorHeight, tunnelSlope} from '#src/lib/gallery/lowerGallery.ts'
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
/** how far out from a display’s back wall its Knots float, over the middle of the pedestals backing onto it */
export const exhibitionKnotOffset = 1.3

/** the pedestals backing onto the displays’ back walls under the Knots, their flanks running straight out of the wall before they round off toward the window; the height is over the floor where they meet the wall, under their Knots */
export const exhibitionPedestal = {
  radius: 1.5,
  length: 0.9,
  height: 0.6,
  plinth: 0.1,
} as const

/** how far north of its Knot the sidecar is centered on the wall, sunk deep into the pedestal’s flank */
const sidecarShift = 1.85
/** how far up the pedestal’s north flank, from the course there to the pedestal’s top, the sidecar’s top meets it */
export const exhibitionSidecarRise = 2 / 3
/** the course’s top under the pedestal’s north flank, over the floor where the pedestal meets the wall under its Knot */
const flankCourse = exhibitionPedestal.plinth - tunnelSlope * exhibitionPedestal.radius

/** the lower sidecar merged into each pedestal’s north flank, running out toward the window like the pedestal before it rounds off, which carries the Knot’s nameplate */
export const exhibitionSidecar = {
  radius: 0.8,
  length: 0.35,
  /** its top over the floor under its middle, which lies lower than the pedestal’s by the slope */
  height: flankCourse + exhibitionSidecarRise * (exhibitionPedestal.height - flankCourse) + tunnelSlope * sidecarShift,
  shift: sidecarShift,
  /** how far out from the back wall the nameplate stands on it */
  signOffset: 0.65,
  /** how far north of its middle the nameplate stands, so the turned plaque clears the pedestal’s cap */
  signShift: 0.1,
  /** how far a turned nameplate turns from facing the window, up the tunnel toward Moonfall to the south or down it toward the Oculus to the north */
  signTurn: Math.PI / 6,
} as const

/** which way each display’s nameplates turn, from its north end south: the lowest down the tunnel toward the Oculus, the middle one not at all and the highest up the tunnel toward Moonfall */
const signTurns = [-1, 0, 1] as const

/** the pedestal’s lobes, north to south, around where it meets the back wall under its Knot */
export const exhibitionPedestalLobes = [
  {
    z: -exhibitionSidecar.shift,
    radius: exhibitionSidecar.radius,
    length: exhibitionSidecar.length,
    height: exhibitionSidecar.height,
  },
  {
    z: 0,
    radius: exhibitionPedestal.radius,
    length: exhibitionPedestal.length,
    height: exhibitionPedestal.height,
  },
] as const satisfies ReadonlyArray<PedestalLobe>

const exhibitionNumberLabel = (number: number) => `#${String(number).padStart(2, '0')}`

/** where the Exhibition shows a Knot in the museum’s meters, three in each display from its north end south, each turned a sixth of a revolution on from the one before, with its pedestal and nameplate */
export const exhibitionSlots = tunnelDisplays.flatMap(display => {
  /** from the back wall out toward the window */
  const direction = Math.sign(display.frontX - display.backX) as -1 | 1
  return display.exhibits.map((exhibit, index) => {
    const z = exhibit.position[2]
    const signZ = z - exhibitionSidecar.shift - exhibitionSidecar.signShift
    const signTurn = signTurns[index] * exhibitionSidecar.signTurn
    return {
      id: exhibit.id,
      direction,
      /** where the pedestal meets the back wall, on the floor */
      pedestal: [display.backX, tunnelFloorHeight(z), z] as Vec3,
      position: [display.backX + direction * exhibitionKnotOffset, tunnelFloorHeight(z) + exhibitionKnotHeight, z] as Vec3,
      /** the nameplate’s plaque over the sidecar, facing the window and turned by its place along it */
      sign: {
        position: [display.backX + direction * exhibitionSidecar.signOffset, tunnelFloorHeight(z - exhibitionSidecar.shift) + exhibitionSidecar.height + knotSign.elevation, signZ] as Vec3,
        // Facing +z at no rotation, it turns from the window by its turn back toward +z, where Moonfall lies, or on toward −z, where the Oculus lies.
        rotation: direction * (Math.PI / 2 - signTurn),
      },
    }
  })
}).map((slot, index) => ({
  ...slot,
  label: exhibitionNumberLabel(index + 1),
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
