import {cameraPose} from './actions.ts'
import {useGallery} from './store.ts'
import {isSunlitRoom} from './sun.ts'

/** how quickly the sun shafts fade after the player walks into or out of a room the sun never reaches, per second */
const fadeRate = 4
let reach = isSunlitRoom(useGallery.getState().room) ? 1 : 0
let updated: number | undefined

/**
 * How much of the sun the air around the player holds: 1 in sunlit rooms, 0 in the ones the sun never reaches, fading in between.
 * The shafts raymarch the sun’s shadow map, and those rooms cast no shadow into it, so their air would otherwise glow as if in open daylight.
 */
export function getSunReach() {
  const now = performance.now()
  // The first frame, frames under frozen time and a detached camera, which jumps between rooms instead of walking, as in snaps and camera bookmarks, settle at once instead of fading.
  const elapsed = updated === undefined || now === updated || cameraPose.focused ? Infinity : (now - updated) / 1000
  updated = now
  const target = isSunlitRoom(useGallery.getState().room) ? 1 : 0
  reach += (target - reach) * Math.min(1, elapsed * fadeRate)
  return reach
}
