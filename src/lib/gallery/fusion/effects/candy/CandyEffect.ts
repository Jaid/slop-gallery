import type {AudioOutput} from '#src/lib/audio/proceduralAudio.ts'
import type {PortalFrame} from '#src/lib/gallery/fusion/portalFrame.ts'

import playCandyBurst from '#src/lib/audio/candyBurst.ts'

import EmergenceEffect from '../base/EmergenceEffect.ts'
import CandyBurst from './CandyBurst.ts'
import {fading, flungTreats} from './flights.ts'

/** Halloween treats burst out of the portal as the result of a successful fusion flips out, like out of a party popper: candies and candy corn rain down and clatter across the floor, confetti flutters after them, and a glockenspiel plays along. */
export default class CandyEffect extends EmergenceEffect {
  override readonly afterglow = fading.start + fading.stagger + fading.duration
  readonly id = 'halloween-candy'

  createSprites() {
    return new CandyBurst(flungTreats)
  }

  sound(audio: AudioOutput, frame: PortalFrame) {
    playCandyBurst(audio, frame, flungTreats)
  }
}
