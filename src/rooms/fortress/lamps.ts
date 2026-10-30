import type {Lamp} from '../base/Room.ts'

import {fortressCurve, fortressLanterns, fortressOrigin} from '#src/lib/gallery/fortress.ts'
import {routeLight} from '#src/lib/gallery/pendants/mounts.ts'

const [originX, originY, originZ] = fortressOrigin
/** under the lantern hanging `along` meters down the curve, in its body */
const lantern = (along: number): Lamp => {
  const [x, y, z] = routeLight(fortressCurve, along)
  return {
    position: [x - originX, y - 0.3 - originY, z - originZ],
    strength: 30,
    tint: '#ffcd8a',
    range: 7,
    decay: 1.75,
    shadow: true,
  }
}

export default {
  // The curve’s two lanterns, hung low, stronger than the corridor’s and fading more gently: a little way north of the mouth, which the Oculus sees, and at the top of the curve, which the Lodge looks down the approach at.
  lantern_east: lantern(fortressLanterns.east),
  lantern_north: lantern(fortressLanterns.north),
} satisfies Record<string, Lamp>
