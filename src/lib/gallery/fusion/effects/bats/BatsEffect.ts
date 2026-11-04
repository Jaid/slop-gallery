import type {AudioOutput} from '#src/lib/audio/proceduralAudio.ts'
import type {PortalFrame} from '#src/lib/gallery/fusion/portalFrame.ts'

import playBatSwarm from '#src/lib/audio/batSwarm.ts'

import EmergenceEffect from '../base/EmergenceEffect.ts'
import {flyingBats} from './flights.ts'
import SwarmingBats from './SwarmingBats.ts'

/** A swarm of bats bursts out of the portal as the result of a successful fusion flips out, whirls around it, squeaking and fluttering, and flies off into the dark. */
export default class BatsEffect extends EmergenceEffect {
  override readonly afterglow = Math.max(...flyingBats.map(({delay, life}) => delay + life))
  readonly id = 'halloween-bats'

  createSprites() {
    return new SwarmingBats(flyingBats)
  }

  sound(audio: AudioOutput, frame: PortalFrame) {
    playBatSwarm(audio, frame, flyingBats)
  }
}
