import {useGallery} from './store.ts'
import {isSunlitRoom} from './sun.ts'

/**
 * How much of the sun the air around the player holds: 1 in sunlit rooms, 0 in the ones the sun never reaches.
 * The shafts raymarch the sun’s shadow map, and those rooms cast no shadow into it, so their air would otherwise glow as if in open daylight.
 */
export function getSunReach() {
  return isSunlitRoom(useGallery.getState().room) ? 1 : 0
}
