import type {Wall, WallOpening} from '../../placement/wallGeometry.ts'
import type {Vec3} from '../types.ts'

import {defaultEgoOptions} from 'ego-player/motor'

import {wallCoordinates} from '../../placement/wallGeometry.ts'
import {wallFace} from '../architectureDimensions.ts'
import {forgeVestibule} from '../forge.ts'

const [vestibuleX, vestibuleZ] = forgeVestibule.center
/** where the cistern’s flat wall stands, back to back with the round wall of the Forge’s vestibule, which touches it there */
const wallZ = vestibuleZ - forgeVestibule.radius
/** low enough to jump onto, well over the baseboards on both sides */
const sill = 1
/** how far its sill stands over the cistern’s floor behind it: so high that no orb rolling along the floor rolls out over it, and so low that a player walks out over it without a step */
const step = 0.05
/** how much room a player crawling through it has over the head, past the character controller’s own gap */
const slack = 0.05
const {contactOffset, crouchHeight} = defaultEgoOptions
/** how high it opens over its sill, at the crown of its arch: just high enough for a crouching player, and as wide, so it opens in a square round its arch */
const height = contactOffset * 2 + crouchHeight + slack

/**
 * The bare window between the Forge’s vestibule and the Bastion’s cistern, through both walls where they touch on the vestibule’s axis: an opening under a round arch, as wide as it is high, which a player who jumps onto its sill and ducks just fits through, and nobody standing.
 * The alchemy machine’s cannon shoots every orb through it, a hand over its sill, down into the cistern’s channel behind it.
 * In the world’s frame; its sill and spring stand over the floor.
 */
export const cisternWindow = {
  /** the middle of the opening where both walls touch, on their center line */
  center: [vestibuleX, wallZ] as const,
  /** how wide it opens straight across, in the cistern’s flat wall */
  width: height,
  sill,
  step,
  /** where its round arch springs, half its width under its crown */
  spring: sill + height / 2,
  rise: height / 2,
  /** how far the vestibule’s round wall curves away behind the flat wall at its jambs, both walls’ center lines apart there, which its reveal lines */
  gap: forgeVestibule.radius - Math.sqrt(forgeVestibule.radius ** 2 - (height / 2) ** 2),
  /** the face of the cistern’s wall behind it, where the cistern’s channel begins */
  channelZ: wallZ - wallFace,
  /** where the cannon’s shot passes it, a hand over its sill in the middle, where both walls touch */
  aim: [vestibuleX, sill + 0.3, wallZ] as Vec3,
}

/** how far a round wall’s cut through it stands outside the stone lining the opening on from the flat wall, which reaches into the round wall where both touch, so their faces never lie in one plane */
const roundTuck = 0.002

/**
 * The window’s opening through a wall it pierces, given relative to the room’s origin like the wall: centered where both walls touch, as wide straight across as the window, which along a round wall’s center line takes a little more, between the same jambs.
 * Through a round wall, its sill lies a hair lower and its head a hair higher, under and over the stone lining the opening.
 */
export function cisternWindowHole(wall: Pick<Wall, 'center' | 'curveRadius' | 'rotation'>, origin: Vec3): WallOpening {
  const [x, z] = cisternWindow.center
  const radius = Math.abs(wall.curveRadius ?? 0)
  const tuck = radius ? roundTuck : 0
  return {
    u: wallCoordinates(wall, [x - origin[0], 0, z - origin[2]]),
    width: radius ? Math.asin(cisternWindow.width / 2 / radius) * radius * 2 : cisternWindow.width,
    bottom: cisternWindow.sill - tuck,
    height: cisternWindow.spring + cisternWindow.rise + tuck,
    rise: cisternWindow.rise + tuck,
    profile: 'arch',
    casing: false,
  }
}
