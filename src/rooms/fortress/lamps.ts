import type {Lamp} from '../base/Room.ts'

import {fortressCurve, fortressLanterns, fortressOrigin} from '#src/lib/gallery/fortress.ts'
import {fortressLink, fortressLinkLanterns} from '#src/lib/gallery/fortressNetwork.ts'
import {routeLight} from '#src/lib/gallery/pendants/mounts.ts'

import climbLamps from './climbLamps.ts'

const [originX, originY, originZ] = fortressOrigin
/** `below` meters under the middle of the lantern hanging `along` meters down the curve, with how it shines */
const lantern = (along: number, shine: Pick<Lamp, 'decay' | 'range' | 'strength'> = {}, below = 0.3): Lamp => {
  const [x, y, z] = routeLight(fortressCurve, along)
  return {
    position: [x - originX, y - below - originY, z - originZ],
    strength: 30,
    tint: '#ffcd8a',
    range: 7,
    decay: 1.75,
    shadow: true,
    ...shine,
  }
}

export default {
  ...climbLamps,
  ...Object.fromEntries(fortressLinkLanterns.map((along, index) => {
    const [x, y, z] = routeLight(fortressLink, along)
    return [`lantern_link_${index}`, {
      ...climbLamps.lantern_mouth,
      position: [x - originX, y - 0.3 - originY, z - originZ] as const,
    }]
  })),
  // The curve’s lanterns, hung low, stronger than the corridor’s and fading more gently: a little way north of the mouth, which the Oculus sees, and behind the apse’s gate, which the Lodge also looks down the approach at.
  lantern_east: lantern(fortressLanterns.east),
  // It throws the bars of the gate onto the platform right in front of it and those of the windows beside it, slanting through them, far out across it: it reaches that far, fading more gently, and shines a little lower than the other one.
  lantern_north: lantern(fortressLanterns.north, {
    strength: 35,
    range: 20,
    decay: 1.25,
  }, 0.6),
} satisfies Record<string, Lamp>
