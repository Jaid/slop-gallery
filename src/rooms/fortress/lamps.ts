import type {Lamp} from '../base/Room.ts'

import {fortressCurve, fortressLanterns, fortressOrigin} from '#src/lib/gallery/fortress.ts'
import {routeLight} from '#src/lib/gallery/pendants/mounts.ts'

const [originX, originY, originZ] = fortressOrigin
/** under the lantern hanging `along` meters down the curve, in its body, with how it shines */
const lantern = (along: number, shine: Pick<Lamp, 'decay' | 'range' | 'strength'> = {}): Lamp => {
  const [x, y, z] = routeLight(fortressCurve, along)
  return {
    position: [x - originX, y - 0.3 - originY, z - originZ],
    strength: 30,
    tint: '#ffcd8a',
    range: 7,
    decay: 1.75,
    shadow: true,
    ...shine,
  }
}

export default {
  // The curve’s lanterns, hung low, stronger than the corridor’s and fading more gently: a little way north of the mouth, which the Oculus sees, and behind the apse’s gate, which the Lodge also looks down the approach at.
  lantern_east: lantern(fortressLanterns.east),
  // It throws the bars of the gate onto the platform right in front of it and those of the windows beside it, slanting through them, far out across it: it reaches that far, fading more gently but weaker, as bright as the others on the gate’s sill.
  lantern_north: lantern(fortressLanterns.north, {
    strength: 28,
    range: 20,
    decay: 1.25,
  }),
} satisfies Record<string, Lamp>
