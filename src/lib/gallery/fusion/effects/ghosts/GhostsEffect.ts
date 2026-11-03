import type {AudioOutput} from '#src/lib/audio/proceduralAudio.ts'
import type Fusion from '#src/lib/gallery/fusion/Fusion.ts'
import type {EffectShow} from '../base/FusionEffect.ts'

import {Group} from 'three/webgpu'

import playGhostChorus from '#src/lib/audio/ghostChorus.ts'

import FusionEffect from '../base/FusionEffect.ts'
import EscapingGhosts from './EscapingGhosts.ts'
import {escapingGhosts} from './flights.ts'

/** how late after the result flipped out the chorus may still start, in seconds, for a portal that only notices then */
const lateness = 0.3
/** Ghosts escape the portal as the result of a successful fusion flips out: they burst out startled, then spiral up into the room, wailing, and fade away. */
export default class GhostsEffect extends FusionEffect {
  override readonly afterglow = Math.max(...escapingGhosts.map(({delay, life}) => delay + life))
  readonly id = 'ghosts'

  show(fusion: Fusion): EffectShow {
    return new GhostsShow(fusion)
  }
}

/** The ghosts escaping one fusion’s portal, and their chorus. */
class GhostsShow implements EffectShow {
  readonly root = new Group
  private readonly fusion: Fusion
  private readonly ghosts = new EscapingGhosts(escapingGhosts)
  private sounded = false

  constructor(fusion: Fusion) {
    this.fusion = fusion
    const {center, normal, tangent} = fusion.frame
    this.ghosts.position.fromArray(center)
    this.ghosts.uniforms.normal.value.fromArray(normal)
    this.ghosts.uniforms.tangent.value.fromArray(tangent)
    this.root.add(this.ghosts)
  }

  dispose() {
    this.ghosts.dispose()
  }

  update(elapsed: number, audio?: AudioOutput) {
    const {emergedAt, frame} = this.fusion
    const since = emergedAt === undefined ? -1 : elapsed - emergedAt
    this.ghosts.uniforms.clock.value = since
    if (since < 0 || this.sounded) {
      return
    }
    this.sounded = true
    if (audio && since < lateness) {
      playGhostChorus(audio, frame.center, escapingGhosts)
    }
  }
}
