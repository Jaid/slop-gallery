import type {ProceduralPlayback} from './proceduralAudio.ts'

import {footstepVoices, landingVoices, playerSoundEffects} from './playerSoundEffects.ts'
import {osc, playVoices} from './proceduralAudio.ts'

// Boost procedural effects by 12 dB without changing narration.
const effectsGain = 0.6 * 10 ** (12 / 20)

export default class SoundEngine {
  private static instance: SoundEngine | undefined
  static existing() {
    return this.instance
  }
  static get() {
    return this.instance ??= new SoundEngine
  }
  readonly context = new AudioContext
  readonly master = this.context.createGain()

  private contactIndex = 0
  private extendedZoom = false
  private lastLanding = Number.NEGATIVE_INFINITY
  private muted = false
  private viewMotion?: ProceduralPlayback
  private zoomAmount = 0
  private zoomBed?: ProceduralPlayback
  private zoomMotion?: ProceduralPlayback

  private constructor() {
    this.master.gain.value = effectsGain
    this.master.connect(this.context.destination)
  }

  land(wood: boolean, impactSpeed: number) {
    if (this.muted) {
      return
    }
    this.lastLanding = this.context.currentTime
    playVoices(this, landingVoices(wood, impactSpeed), `land:${this.contactIndex++}`)
  }

  mute(muted: boolean) {
    if (this.muted === muted) {
      return
    }
    this.muted = muted
    this.master.gain.setTargetAtTime(muted ? 0 : effectsGain, this.context.currentTime, 0.08)
    if (muted) {
      this.stopPlayerSounds()
    }
  }

  async resume() {
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
  }

  /** A single sustained bed follows the eased zoom amount, never one new sound per frame. */
  setZoom(amount: number) {
    this.zoomAmount = this.muted ? 0 : Math.max(0, Math.min(1, amount))
    if (this.zoomAmount === 0) {
      this.zoomBed?.stop(0.06)
      this.zoomBed = undefined
      this.zoomMotion?.stop()
      this.zoomMotion = undefined
      return
    }
    this.zoomBed ??= playVoices(this, playerSoundEffects.zoom.voices, playerSoundEffects.zoom.id, {
      sustain: true,
      gain: 0,
    })
    this.updateZoomGain()
  }

  step(wood: boolean, speed: number, crouching: boolean) {
    if (this.muted || speed < 0.1 || this.context.currentTime - this.lastLanding < 0.1) {
      return
    }
    // The stride callback owns cadence; no fixed cooldown may discard faster steps.
    const index = this.contactIndex++
    playVoices(this, footstepVoices(wood, speed, {
      crouching,
      variation: Math.sin(index * 2.39996),
    }), `step:${index}`)
  }

  stopPlayerSounds() {
    this.setZoom(0)
    this.viewMotion?.stop()
    this.viewMotion = undefined
  }

  tone(frequency: number, duration = 0.3, volume = 0.055) {
    if (!this.muted) {
      playVoices(this, [osc(frequency, duration, volume, {endFrequency: frequency * 0.55})], 'tone')
    }
  }

  viewTransition(entering: boolean) {
    this.viewMotion?.stop()
    this.viewMotion = undefined
    if (this.muted) {
      return
    }
    const effect = entering ? playerSoundEffects.viewEnter : playerSoundEffects.viewLeave
    this.viewMotion = playVoices(this, effect.voices, effect.id)
  }

  zoomTransition(extended: boolean, retract: boolean, duration: number) {
    this.zoomMotion?.stop()
    this.zoomMotion = undefined
    this.extendedZoom = extended && !retract
    this.updateZoomGain()
    if (this.muted || duration === 0) {
      return
    }
    let effect = retract ? playerSoundEffects.zoomRetract : playerSoundEffects.zoomForward
    if (extended) {
      effect = retract ? playerSoundEffects.extendedZoomRetract : playerSoundEffects.extendedZoomForward
    }
    this.zoomMotion = playVoices(this, effect.voices, effect.id, {duration})
  }

  private updateZoomGain() {
    this.zoomBed?.gain.setTargetAtTime(this.zoomAmount * (this.extendedZoom ? 1.35 : 1), this.context.currentTime, 0.025)
  }
}
