import type {Vec3} from '../gallery/types.ts'

import {clamp} from 'math'

/** how far a sound carries: at full level within `near` meters, fading linearly to silence at `far` */
export type Hearing = {
  far: number
  near: number
}

/** the cutoff of the lowpass a sound is heard through right next to it, which leaves it whole */
export const openCutoff = 18_000
/** the cutoff of the lowpass a sound is heard through at the edge of its hearing, a muffled wash */
const farCutoff = 2200

/** How far, 0–1, the listener at `listener` is on a sound’s way from `near` to `far` round `position`: 0 within `near`, 1 from `far` on. */
export function hearingShare(position: Vec3, listener: Vec3, {far, near}: Hearing) {
  const distance = Math.hypot(listener[0] - position[0], listener[1] - position[1], listener[2] - position[2])
  return clamp((distance - near) / (far - near), 0, 1)
}

/** The lowpass cutoff in Hz a sound is heard through at `share` (0–1) of its way from `near` to `far`, see {@link hearingShare}: distance takes the highs before the level, open nearby and closing toward a muffled 2.2 kHz at the edge of hearing, quickly at first. */
export function absorptionCutoff(share: number) {
  return openCutoff * (farCutoff / openCutoff) ** clamp(share, 0, 1) ** 0.7
}

/** Where the listener of the context stands, as `AmbienceListener` moves it with the camera. */
export function listenerPosition({listener}: BaseAudioContext): Vec3 {
  return [listener.positionX.value, listener.positionY.value, listener.positionZ.value]
}
