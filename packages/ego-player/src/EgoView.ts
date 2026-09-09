import type {EgoOptions} from './options.ts'

import {clamp} from './math.ts'

/** Per-player camera smoothing and stride phase, independent of renderer and audio policy. */
export class EgoView {
  height: number
  private phase = 0

  constructor(eyeHeight: number) {
    this.height = eyeHeight
  }

  reset(eyeHeight: number) {
    this.height = eyeHeight
    this.phase = 0
  }

  update(delta: number, speed: number, grounded: boolean, crouching: boolean, options: Required<Omit<EgoOptions, 'collisionGroups'>>) {
    if (!Number.isFinite(delta) || delta <= 0) {
      return {
        offset: this.height,
        stepped: false,
      }
    }
    const dt = Math.min(delta, 0.1)
    const targetHeight = crouching ? options.crouchEyeHeight : options.eyeHeight
    const blend = 1 - Math.exp(-Math.max(options.cameraSpeed, 0) * dt)
    this.height += (targetHeight - this.height) * blend
    const amount = grounded ? clamp(speed / Math.max(options.speed, 0.001), 0, 1.5) : 0
    const previous = this.phase
    if (amount > 0.03) {
      this.phase += dt * Math.max(options.bobFrequency, 0) * Math.PI * 2 * clamp(amount, 0.6, 1.5)
    }
    const cycle = Math.PI * 2
    const contact = Math.PI * 1.5
    // One event at each trough, not one event per rendered frame near the trough.
    const stepped = amount > 0.1 && Math.floor((this.phase - contact) / cycle) > Math.floor((previous - contact) / cycle)
    const bob = Math.sin(this.phase) * Math.max(options.bobStrength, 0) * amount
    this.phase %= cycle
    return {
      offset: this.height + bob,
      stepped,
    }
  }
}
