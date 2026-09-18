import type {SoundEffect, Voice} from './proceduralAudio.ts'

import {noise, osc} from './proceduralAudio.ts'

export const footstepStyles = [
  {
    id: 'soft-sole',
    label: 'Soft Sole',
  },
  {
    id: 'heel-toe',
    label: 'Heel / Toe',
  },
  {
    id: 'brushed-sole',
    label: 'Brushed Sole',
  },
  {
    id: 'rubber-flex',
    label: 'Rubber Flex',
  },
  {
    id: 'dusty-floor',
    label: 'Dusty Floor',
  },
] as const

export type FootstepStyle = (typeof footstepStyles)[number]['id']

type FootstepOptions = {
  crouching?: boolean
  style?: FootstepStyle
  variation?: number
}

/** Speed is actual horizontal world units/second, not the requested movement or Shift state. */
export function footstepVoices(wood: boolean, speed: number, {crouching = false, style = footstepStyles[0].id, variation = 0}: FootstepOptions = {}): Array<Voice> {
  const effort = Math.max(0, Math.min(1, speed / 9))
  const pitch = (0.9 + effort * 0.16) * (1 + variation * 0.025)
  const brightness = (crouching ? 0.68 : 1) * (0.88 + effort * 0.18)
  const gain = crouching ? 0.42 : 1
  const duration = crouching ? 0.16 - effort * 0.02 : 0.13 - effort * 0.035
  const attack = crouching ? 0.02 : 0.008
  const body = (base: number, growth: number) => (base + effort * growth) * gain
  const frequency = (woodFrequency: number, hardFrequency: number) => (wood ? woodFrequency : hardFrequency) * pitch * brightness
  switch (style) {
    case 'soft-sole': {
      return [
        osc((wood ? 112 : 148) * pitch, duration, body(0.0045, 0.011), {
          endFrequency: (wood ? 54 : 70) * pitch,
          type: 'sine',
          attack,
        }),
        noise(duration * 0.82, body(0.0026, 0.007), {
          type: 'bandpass',
          frequency: frequency(430, 680),
          endFrequency: frequency(180, 260),
          q: 0.5,
        }, {attack: attack * 1.25}),
        noise(duration * 0.55, body(0.0009, 0.0024), {
          type: 'lowpass',
          frequency: frequency(760, 1050),
          endFrequency: frequency(260, 360),
          q: 0.45,
        }, {
          attack: attack * 1.3,
          delay: duration * 0.22,
        }),
      ]
    }
    case 'heel-toe': {
      return [
        osc((wood ? 160 : 220) * pitch, duration * 0.62, body(0.0036, 0.0085), {
          endFrequency: (wood ? 82 : 108) * pitch,
          type: 'triangle',
          attack: attack * 0.8,
        }),
        osc((wood ? 235 : 315) * pitch, duration * 0.52, body(0.0024, 0.0058), {
          endFrequency: (wood ? 112 : 145) * pitch,
          type: 'sine',
          attack,
          delay: duration * 0.16,
        }),
        noise(duration * 0.48, body(0.0014, 0.0038), {
          type: 'bandpass',
          frequency: frequency(610, 900),
          endFrequency: frequency(270, 390),
          q: 0.7,
        }, {
          attack: attack * 1.1,
          delay: duration * 0.2,
        }),
      ]
    }
    case 'brushed-sole': {
      return [
        noise(duration, body(0.0032, 0.0078), {
          type: 'lowpass',
          frequency: frequency(520, 760),
          endFrequency: frequency(210, 300),
          q: 0.4,
        }, {attack: attack * 1.5}),
        noise(duration * 0.7, body(0.0023, 0.0052), {
          type: 'bandpass',
          frequency: frequency(360, 540),
          endFrequency: frequency(190, 280),
          q: 0.38,
        }, {
          attack: attack * 1.8,
          delay: duration * 0.12,
        }),
        noise(duration * 0.5, body(0.001, 0.0025), {
          type: 'lowpass',
          frequency: frequency(820, 1150),
          endFrequency: frequency(300, 420),
          q: 0.35,
        }, {
          attack: attack * 1.7,
          delay: duration * 0.32,
        }),
      ]
    }
    case 'rubber-flex': {
      return [
        osc((wood ? 92 : 118) * pitch, duration * 1.08, body(0.0048, 0.0105), {
          endFrequency: (wood ? 62 : 78) * pitch,
          type: 'sine',
          attack: attack * 1.3,
        }),
        osc((wood ? 190 : 245) * pitch, duration * 0.72, body(0.0019, 0.0048), {
          endFrequency: (wood ? 118 : 148) * pitch,
          type: 'triangle',
          attack: attack * 1.45,
          delay: duration * 0.08,
        }),
        noise(duration * 0.58, body(0.0012, 0.0034), {
          type: 'lowpass',
          frequency: frequency(500, 720),
          endFrequency: frequency(220, 310),
          q: 0.5,
        }, {
          attack: attack * 1.5,
          delay: duration * 0.24,
        }),
      ]
    }
    case 'dusty-floor': {
      return [
        noise(duration * 0.88, body(0.0034, 0.0082), {
          type: 'bandpass',
          frequency: frequency(300, 430),
          endFrequency: frequency(170, 240),
          q: 0.42,
        }, {attack: attack * 1.35}),
        noise(duration * 0.62, body(0.0022, 0.0054), {
          type: 'lowpass',
          frequency: frequency(860, 1180),
          endFrequency: frequency(330, 450),
          q: 0.45,
        }, {
          attack: attack * 1.45,
          delay: duration * 0.12,
        }),
        noise(duration * 0.48, body(0.0013, 0.0032), {
          type: 'bandpass',
          frequency: frequency(510, 720),
          endFrequency: frequency(240, 330),
          q: 0.35,
        }, {
          attack: attack * 1.6,
          delay: duration * 0.3,
        }),
      ]
    }
  }
}

/** Impact uses downward speed before collision resolution removes it. */
export function landingVoices(wood: boolean, impactSpeed: number): Array<Voice> {
  const weight = Math.max(0, Math.min(1, impactSpeed / 10))
  return [
    osc(wood ? 115 : 155, 0.14 + weight * 0.1, 0.013 + weight * 0.031, {
      endFrequency: wood ? 44 : 58,
    }),
    noise(0.075 + weight * 0.07, 0.008 + weight * 0.023, {
      type: 'lowpass',
      frequency: wood ? 850 : 2100,
      endFrequency: wood ? 200 : 500,
    }),
    osc(wood ? 185 : 280, 0.08, 0.004 + weight * 0.009, {
      endFrequency: wood ? 85 : 120,
      delay: 0.018,
      type: 'triangle',
    }),
  ]
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
  land: {
    id: 'SFX-38',
    label: 'Ground Contact',
    voices: landingVoices(false, 5),
  },
} satisfies Record<string, SoundEffect>
