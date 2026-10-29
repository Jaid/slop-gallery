import world from '#src/worlds/current.ts'

import {useGallery} from './store.ts'

/**
 * How much of the sun the air around the player holds: the volumetric sun of the room the player is in, 0 in the ones the sun never reaches.
 * The shafts raymarch the sun’s shadow map, and those rooms cast no shadow into it, so their air would otherwise glow as if in open daylight.
 */
export function getSunReach() {
  return world.roomById(useGallery.getState().room)?.volumetricSun ?? 1
}
