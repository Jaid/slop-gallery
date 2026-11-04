import type {AudioOutput} from '#src/lib/audio/proceduralAudio.ts'
import type {PortalFrame} from '#src/lib/gallery/fusion/portalFrame.ts'

import playGhostChorus from '#src/lib/audio/ghostChorus.ts'

import EmergenceEffect from '../base/EmergenceEffect.ts'
import EscapingGhosts from './EscapingGhosts.ts'
import {escapingGhosts} from './flights.ts'

/** Ghosts escape the portal as the result of a successful fusion flips out: they burst out startled, then spiral up into the room, wailing, and fade away. */
export default class GhostsEffect extends EmergenceEffect {
  override readonly afterglow = Math.max(...escapingGhosts.map(({delay, life}) => delay + life))
  readonly id = 'spook-ghosts'

  createSprites() {
    return new EscapingGhosts(escapingGhosts)
  }

  sound(audio: AudioOutput, {center}: PortalFrame) {
    playGhostChorus(audio, center, escapingGhosts)
  }
}
