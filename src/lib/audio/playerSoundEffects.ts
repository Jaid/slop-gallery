import type {SoundEffect, Voice} from './proceduralAudio.ts'

import {noise, osc} from './proceduralAudio.ts'

export type FootstepSurface = 'fabric' | 'generic' | 'glass' | 'hollow'

type FootstepOptions = {
  crouching?: boolean
  strength?: number
  variation?: number
}

const surfaceProfiles = {
  generic: {
    attack: 1,
    body: [86, 57],
    brightness: 1,
    contact: [360, 180],
    gain: 1,
    q: 0.3,
    tail: [125, 82],
    duration: 1,
  },
  hollow: {
    attack: 1,
    body: [68, 48],
    brightness: 1,
    contact: [280, 140],
    gain: 1,
    q: 0.3,
    tail: [105, 72],
    duration: 1,
  },
  glass: {
    attack: 0.78,
    body: [136, 92],
    brightness: 1.08,
    contact: [620, 290],
    gain: 0.82,
    q: 0.42,
    tail: [225, 148],
    duration: 0.82,
  },
  fabric: {
    attack: 1.45,
    body: [56, 42],
    brightness: 0.68,
    contact: [170, 95],
    gain: 0.58,
    q: 0.24,
    tail: [78, 54],
    duration: 0.94,
  },
} satisfies Record<FootstepSurface, {
  attack: number
  body: readonly [number, number]
  brightness: number
  contact: readonly [number, number]
  duration: number
  gain: number
  q: number
  tail: readonly [number, number]
}>

/** Speed is actual horizontal world units/second, not the requested movement or Shift state. */
export function footstepVoices(surface: FootstepSurface, speed: number, {crouching = false, strength = 1, variation = 0}: FootstepOptions = {}): Array<Voice> {
  const profile = surfaceProfiles[surface]
  const effort = Math.max(0, Math.min(1, speed / 9))
  const pitch = (0.95 + effort * 0.08) * (1 + variation * 0.008)
  const brightness = (crouching ? 0.62 : 1) * (0.82 + effort * 0.12) * profile.brightness
  const gain = (crouching ? 0.34 : 1) * Math.max(0, Math.min(12, strength)) * profile.gain
  const duration = (crouching ? 0.105 - effort * 0.01 : 0.085 - effort * 0.018) * profile.duration
  const attack = (crouching ? 0.016 : 0.006) * profile.attack
  const body = (base: number, growth: number) => (base + effort * growth) * gain
  return [
    osc(profile.body[0] * pitch, duration, body(0.002, 0.0042), {
      endFrequency: profile.body[1] * pitch,
      attack: attack * 1.5,
    }),
    noise(duration * 0.72, body(0.0012, 0.0025), {
      type: 'lowpass',
      frequency: profile.contact[0] * pitch * brightness,
      endFrequency: profile.contact[1] * pitch * brightness,
      q: profile.q,
    }, {attack: attack * 1.7}),
    osc(profile.tail[0] * pitch, duration * 0.4, body(0.0006, 0.0012), {
      endFrequency: profile.tail[1] * pitch,
      attack: attack * 1.4,
      delay: duration * 0.09,
    }),
  ]
}

/** Landing strength follows impact energy (speed squared), then caps before clipping becomes a concern. */
export function impactFootstepStrength(impactSpeed: number) {
  const normalized = Math.max(0, Math.min(1, impactSpeed / 12))
  return 2.5 + normalized * normalized * 9.5
}

/** Sonic families share a texture, but casual/extended and forward/retract remain distinct. */
function zoomSweep(extended: boolean, retract: boolean): Array<Voice> {
  const low = extended ? 290 : 190
  const high = extended ? 1260 : 720
  return [
    osc(retract ? high : low, 0.2, extended ? 0.013 : 0.011, {
      endFrequency: retract ? low : high,
      type: 'triangle',
      attack: 0.075,
      filter: {
        type: 'lowpass',
        frequency: 1900,
      },
    }),
    noise(0.2, extended ? 0.016 : 0.012, {
      type: 'bandpass',
      frequency: retract ? 2800 : 500,
      endFrequency: retract ? 400 : 2400,
      q: 0.7,
    }, {attack: 0.09}),
  ]
}

export const playerSoundEffects = {
  zoomForward: {
    id: 'SFX-31',
    label: 'Zoom Forward',
    voices: zoomSweep(false, false),
  },
  extendedZoomForward: {
    id: 'SFX-32',
    label: 'Extended Zoom Forward',
    voices: zoomSweep(true, false),
  },
  zoomRetract: {
    id: 'SFX-33',
    label: 'Zoom Retract',
    voices: zoomSweep(false, true),
  },
  extendedZoomRetract: {
    id: 'SFX-34',
    label: 'Extended Zoom Retract',
    voices: zoomSweep(true, true),
  },
  viewEnter: {
    id: 'SFX-35',
    label: 'Viewing Mode Enter',
    voices: [
      noise(0.32, 0.012, {
        type: 'bandpass',
        frequency: 450,
        endFrequency: 1800,
        q: 0.6,
      }, {attack: 0.09}),
      osc(330, 0.28, 0.012, {
        endFrequency: 495,
        attack: 0.025,
      }),
      osc(660, 0.25, 0.008, {
        delay: 0.075,
        attack: 0.03,
      }),
    ],
  },
  viewLeave: {
    id: 'SFX-36',
    label: 'Viewing Mode Leave',
    voices: [
      noise(0.26, 0.012, {
        type: 'bandpass',
        frequency: 1800,
        endFrequency: 400,
        q: 0.6,
      }, {attack: 0.07}),
      osc(495, 0.26, 0.012, {
        endFrequency: 247.5,
        attack: 0.025,
      }),
      osc(330, 0.22, 0.007, {
        delay: 0.045,
        endFrequency: 165,
        attack: 0.03,
      }),
    ],
  },
  zoom: {
    id: 'SFX-37',
    label: 'Zoom Focus',
    // A finite audition on the soundboard; gameplay sustains these quiet, consonant tones.
    voices: [osc(174, 1.2, 0.0018, {attack: 0.16}), osc(261, 1.2, 0.0009, {attack: 0.2})],
  },
} satisfies Record<string, SoundEffect>
