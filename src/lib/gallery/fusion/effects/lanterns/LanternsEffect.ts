import type {AudioOutput} from '#src/lib/audio/proceduralAudio.ts'
import type {PortalFrame} from '#src/lib/gallery/fusion/portalFrame.ts'

import playLanternGlee from '#src/lib/audio/lanternGlee.ts'

import EmergenceEffect from '../base/EmergenceEffect.ts'
import {poppingLanterns, smoking} from './flights.ts'
import FloatingLanterns from './FloatingLanterns.ts'

/** Jack-o’-lanterns pop out of the portal one after another as the result of a successful fusion flips out, each knocking out a note of a kooky tune, float round it grinning and flickering, and are blown out one after another, vanishing in a wisp of smoke. */
export default class LanternsEffect extends EmergenceEffect {
  override readonly afterglow = Math.max(...poppingLanterns.map(({blowOut}) => blowOut)) + smoking
  readonly id = 'halloween-lanterns'

  createSprites() {
    return new FloatingLanterns(poppingLanterns)
  }

  sound(audio: AudioOutput, frame: PortalFrame) {
    playLanternGlee(audio, frame, poppingLanterns)
  }
}
