import type {Lamp} from '../base/Room.ts'

import {fortressCurve, fortressLanterns, fortressOrigin} from '#src/lib/gallery/fortress.ts'
import {routeLight} from '#src/lib/gallery/pendants/mounts.ts'

const [originX, originY, originZ] = fortressOrigin
/** under the lantern hanging `along` meters down the curve, in its body, reaching `range` meters */
const lantern = (along: number, range = 7): Lamp => {
  const [x, y, z] = routeLight(fortressCurve, along)
  return {
    position: [x - originX, y - 0.3 - originY, z - originZ],
    strength: 30,
    tint: '#ffcd8a',
    range,
    decay: 1.75,
    shadow: true,
  }
}
/** The lanterns behind the apse’s openings reach far enough through them to throw the bars’ shadows across the platform. */
const throughOpening = 10

export default {
  // The curve’s lanterns, hung low, stronger than the corridor’s and fading more gently: a little way north of the mouth, which the Oculus sees, and behind the apse’s gate, which the Lodge also looks down the approach at, and its two windows.
  lantern_east: lantern(fortressLanterns.east),
  lantern_north: lantern(fortressLanterns.north, throughOpening),
  lantern_northwest: lantern(fortressLanterns.northwest, throughOpening),
  lantern_northeast: lantern(fortressLanterns.northeast, throughOpening),
} satisfies Record<string, Lamp>
