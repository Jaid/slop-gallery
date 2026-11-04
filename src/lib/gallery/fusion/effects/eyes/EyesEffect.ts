import type {AudioOutput} from '#src/lib/audio/proceduralAudio.ts'
import type {PortalFrame} from '#src/lib/gallery/fusion/portalFrame.ts'

import playStaringEyes from '#src/lib/audio/staringEyes.ts'

import EmergenceEffect from '../base/EmergenceEffect.ts'
import {shutting, staringEyes} from './flights.ts'
import StaringEyes from './StaringEyes.ts'

/** Eyes open in the dark round the portal as the result of a successful fusion flips out, darting about to whispers until they all snap round at once to stare at whoever watches, some weeping blood, until they slam shut one after another. */
export default class EyesEffect extends EmergenceEffect {
  override readonly afterglow = Math.max(...staringEyes.map(({close}) => close)) + shutting.lids + shutting.fading
  readonly id = 'horror-eyes'

  createSprites() {
    return new StaringEyes(staringEyes)
  }

  sound(audio: AudioOutput, frame: PortalFrame) {
    playStaringEyes(audio, frame, staringEyes)
  }
}
