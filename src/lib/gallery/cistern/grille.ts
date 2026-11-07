import type {Wall, WallOpening} from '../../placement/wallGeometry.ts'
import type {Vec3} from '../types.ts'

import {wallCoordinates} from '../../placement/wallGeometry.ts'
import {barDepth, wallFace} from '../architectureDimensions.ts'
import {forgeVestibule} from '../forge.ts'

const [vestibuleX, vestibuleZ] = forgeVestibule.center
/** where the cistern’s flat wall stands, back to back with the round wall of the Forge’s vestibule, which touches it there */
const wallZ = vestibuleZ - forgeVestibule.radius
/** how far apart the grille’s bars and bands stand, middle to middle: wide enough for an orb to fly through the middle of a cell with a hand to spare */
const pitch = 0.45
/** how many cells across and how many up to where its arch springs */
const [columns, rows] = [3, 3]
/** level with the cistern’s floor behind it, well over the baseboards on both sides */
const sill = 0.8

/**
 * The barred window between the Forge’s vestibule and the Bastion’s cistern, through both walls where they touch on the vestibule’s axis: an iron grille like the apse’s windows, its upright bars and flat bands a grid of square cells an orb flies through, under a flat segmental arch.
 * The alchemy machine’s cannon shoots every orb through the middle of its lowest cell, against the backstop over the cistern’s channel right behind it.
 * In the world’s frame; its sill, bands and spring stand over the floor.
 */
export const cisternGrille = {
  /** the middle of the opening where both walls touch, on their center line */
  center: [vestibuleX, wallZ] as const,
  /** how wide it opens straight across, in the cistern’s flat wall */
  width: pitch * columns,
  sill,
  pitch,
  columns,
  /** the heights of the bands across the bars, between its rows of cells */
  bands: Array.from({length: rows - 1}, (_, row) => sill + pitch * (row + 1)),
  /** where its arch springs, over its top row */
  spring: sill + pitch * rows,
  rise: 0.25,
  /** how far the vestibule’s round wall curves away behind the flat wall at its jambs, both walls’ center lines apart there, which its reveal lines */
  gap: forgeVestibule.radius - Math.sqrt(forgeVestibule.radius ** 2 - (pitch * columns / 2) ** 2),
  /** where its bars stand: in the cistern’s wall, a bar’s depth in front of its center line */
  barZ: wallZ - barDepth,
  /** the face of the cistern’s wall behind it, where the cistern’s channel begins */
  channelZ: wallZ - wallFace,
  /** the middle of its lowest cell in the plane of its bars, which the cannon’s shot passes */
  aim: [vestibuleX, sill + pitch / 2, wallZ - barDepth] as Vec3,
}

/** how far a round wall’s cut through it stands outside the stone lining the opening on from the flat wall, which reaches into the round wall where both touch, so their faces never lie in one plane */
const roundTuck = 0.002

/**
 * The grille’s opening through a wall it pierces, given relative to the room’s origin like the wall: centered where both walls touch, as wide straight across as the grille, which along a round wall’s center line takes a little more, between the same jambs.
 * Through a round wall, its sill lies a hair lower and its head a hair higher, under and over the stone lining the opening.
 */
export function cisternGrilleHole(wall: Pick<Wall, 'center' | 'curveRadius' | 'rotation'>, origin: Vec3): WallOpening {
  const [x, z] = cisternGrille.center
  const radius = Math.abs(wall.curveRadius ?? 0)
  const tuck = radius ? roundTuck : 0
  return {
    u: wallCoordinates(wall, [x - origin[0], 0, z - origin[2]]),
    width: radius ? Math.asin(cisternGrille.width / 2 / radius) * radius * 2 : cisternGrille.width,
    bottom: cisternGrille.sill - tuck,
    height: cisternGrille.spring + cisternGrille.rise + tuck,
    rise: cisternGrille.rise + tuck,
    profile: 'arch',
    casing: false,
  }
}
