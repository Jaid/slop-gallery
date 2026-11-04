import type {AudioOutput} from '#src/lib/audio/proceduralAudio.ts'
import type {PortalFrame} from '#src/lib/gallery/fusion/portalFrame.ts'

import playFleshTendrils from '#src/lib/audio/fleshTendrils.ts'

import EmergenceEffect from '../base/EmergenceEffect.ts'
import {lashingTendrils, snapping} from './flights.ts'
import WrithingTendrils from './WrithingTendrils.ts'

/** Fleshy tendrils lash out of the portal as the result of a successful fusion flips out, writhe and grope about toward the room under a deep groan and snap back into it one after another. */
export default class TendrilsEffect extends EmergenceEffect {
  override readonly afterglow = Math.max(...lashingTendrils.map(({retract}) => retract)) + snapping
  readonly id = 'horror-tendrils'

  createSprites() {
    return new WrithingTendrils(lashingTendrils)
  }

  sound(audio: AudioOutput, frame: PortalFrame) {
    playFleshTendrils(audio, frame, lashingTendrils)
  }
}
