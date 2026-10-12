import type {SoundEffect, Voice} from './proceduralAudio.ts'

import {noise, osc} from './proceduralAudio.ts'

type OscillatorOptions = Parameters<typeof osc>[3]
/** Frequency ratio, relative level and relative decay of one vibrational mode. */
type Mode = readonly [ratio: number, gain: number, decay: number]

/** Struck objects ring with inharmonic modes; upper modes are quieter and die sooner. */
const struck = (fundamental: number, modes: ReadonlyArray<Mode>, duration: number, volume: number, options: OscillatorOptions = {}) => modes.map(([ratio, gain, decay]) => osc(fundamental * ratio, duration * decay, volume * gain, options))
/** Repeats a recipe at the given onsets, scaling each repetition’s level. */
const repeat = (voices: ReadonlyArray<Voice>, hits: ReadonlyArray<readonly [delay: number, gain: number]>) => hits.flatMap(([delay, gain]) => voices.map(voice => ({
  ...voice,
  delay: (voice.delay ?? 0) + delay,
  volume: voice.volume * gain,
})))

/** Archived candidates for navigating menus and settings. */
export const menuSoundEffects: Array<SoundEffect> = [
  {
    id: 'SFX-58',
    label: 'Menu Tab',
    voices: [
      noise(0.025, 0.008, {
        type: 'highpass',
        frequency: 3600,
      }),
      osc(587.33, 0.08, 0.016, {type: 'triangle'}),
      osc(1174.66, 0.05, 0.006, {delay: 0.004}),
    ],
  },
  {
    id: 'SFX-59',
    label: 'Menu Back',
    voices: [
      osc(659.25, 0.07, 0.016, {type: 'triangle'}),
      osc(493.88, 0.11, 0.016, {
        delay: 0.06,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-60',
    label: 'Scroll Notch',
    voices: [
      noise(0.018, 0.007, {
        type: 'bandpass',
        frequency: 2600,
        q: 2,
      }),
      osc(1250, 0.03, 0.009, {endFrequency: 1050}),
    ],
  },
  {
    id: 'SFX-61',
    label: 'Slider Step',
    voices: [
      osc(1480, 0.04, 0.012, {
        endFrequency: 1380,
        type: 'triangle',
      }),
      noise(0.02, 0.005, {
        type: 'highpass',
        frequency: 6000,
      }),
    ],
  },
  {
    id: 'SFX-62',
    label: 'Dropdown Open',
    voices: [
      noise(0.09, 0.008, {
        type: 'bandpass',
        frequency: 900,
        endFrequency: 2600,
        q: 0.9,
      }, {attack: 0.02}),
      osc(440, 0.08, 0.014, {
        endFrequency: 660,
        type: 'triangle',
      }),
      osc(880, 0.09, 0.009, {delay: 0.06}),
    ],
  },
  {
    id: 'SFX-63',
    label: 'Dropdown Close',
    voices: [
      noise(0.08, 0.008, {
        type: 'bandpass',
        frequency: 2600,
        endFrequency: 900,
        q: 0.9,
      }, {attack: 0.015}),
      osc(660, 0.08, 0.014, {
        endFrequency: 440,
        type: 'triangle',
      }),
      osc(330, 0.07, 0.008, {
        delay: 0.05,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-64',
    label: 'Panel Slide',
    voices: [
      noise(0.24, 0.011, {
        type: 'bandpass',
        frequency: 700,
        endFrequency: 2300,
        q: 0.8,
      }, {attack: 0.08}),
      osc(196, 0.2, 0.008, {
        endFrequency: 294,
        type: 'triangle',
        attack: 0.06,
      }),
    ],
  },
  {
    id: 'SFX-65',
    label: 'Confirm Pluck',
    voices: [
      osc(659.25, 0.18, 0.018, {type: 'triangle'}),
      osc(1318.51, 0.1, 0.007),
      noise(0.015, 0.006, {
        type: 'highpass',
        frequency: 4000,
      }),
    ],
  },
  {
    id: 'SFX-66',
    label: 'Cancel Pluck',
    voices: [
      osc(311.13, 0.16, 0.018, {
        endFrequency: 293.66,
        type: 'triangle',
      }),
      osc(155.56, 0.12, 0.01, {endFrequency: 146.83}),
    ],
  },
  {
    id: 'SFX-67',
    label: 'Focus Glint',
    voices: [
      osc(1760, 0.09, 0.01),
      osc(2637.02, 0.12, 0.007, {delay: 0.035}),
    ],
  },
  {
    id: 'SFX-68',
    label: 'Key Tap',
    voices: [
      noise(0.03, 0.012, {
        type: 'lowpass',
        frequency: 2200,
        endFrequency: 900,
      }),
      osc(240, 0.035, 0.012, {
        endFrequency: 170,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-69',
    label: 'Settings Saved',
    voices: [
      osc(587.33, 0.09, 0.014, {type: 'triangle'}),
      osc(739.99, 0.09, 0.014, {
        delay: 0.06,
        type: 'triangle',
      }),
      osc(880, 0.2, 0.015, {delay: 0.12}),
      osc(1760, 0.12, 0.005, {delay: 0.125}),
    ],
  },
]

/** Archived candidates for messages, completions and warnings. */
export const notificationSoundEffects: Array<SoundEffect> = [
  {
    id: 'SFX-70',
    label: 'Message Ping',
    voices: [
      osc(1046.5, 0.32, 0.017),
      osc(1567.98, 0.28, 0.014, {delay: 0.09}),
      osc(3135.96, 0.12, 0.004, {delay: 0.092}),
    ],
  },
  {
    id: 'SFX-71',
    label: 'Gentle Nudge',
    voices: [
      osc(523.25, 0.14, 0.014, {attack: 0.02}),
      osc(523.25, 0.18, 0.012, {
        delay: 0.16,
        attack: 0.02,
      }),
      osc(1046.5, 0.12, 0.004, {delay: 0.16}),
    ],
  },
  {
    id: 'SFX-72',
    label: 'Mail Drop',
    voices: [
      osc(783.99, 0.1, 0.015, {
        endFrequency: 1046.5,
        type: 'triangle',
      }),
      osc(1567.98, 0.26, 0.012, {delay: 0.08}),
      noise(0.06, 0.005, {
        type: 'highpass',
        frequency: 5000,
      }, {delay: 0.08}),
    ],
  },
  {
    id: 'SFX-73',
    label: 'Reminder Bell',
    voices: struck(698.46, [
      [1, 1, 1],
      [2.01, 0.5, 0.7],
      [3.02, 0.3, 0.5],
      [4.1, 0.15, 0.35],
    ], 0.9, 0.018),
  },
  {
    id: 'SFX-74',
    label: 'Download Done',
    voices: [
      osc(523.25, 0.08, 0.013, {type: 'triangle'}),
      osc(659.25, 0.08, 0.013, {
        delay: 0.05,
        type: 'triangle',
      }),
      osc(783.99, 0.08, 0.013, {
        delay: 0.1,
        type: 'triangle',
      }),
      osc(1046.5, 0.3, 0.015, {delay: 0.15}),
    ],
  },
  {
    id: 'SFX-75',
    label: 'Save Complete',
    voices: [
      osc(440, 0.3, 0.012),
      osc(659.25, 0.3, 0.012, {delay: 0.01}),
      osc(880, 0.26, 0.012, {
        delay: 0.12,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-76',
    label: 'Low Battery',
    voices: [880, 739.99, 622.25].map((frequency, index) => osc(frequency, index === 2 ? 0.18 : 0.1, 0.012, {
      delay: index * 0.13,
      type: 'square',
      filter: {
        type: 'lowpass',
        frequency: 1200,
      },
    })),
  },
  {
    id: 'SFX-77',
    label: 'Double Ping',
    voices: repeat([osc(1318.51, 0.12, 0.016), osc(2637.02, 0.07, 0.004)], [[0, 1], [0.11, 0.85]]),
  },
  {
    id: 'SFX-78',
    label: 'Incoming Call',
    voices: Array.from({length: 6}, (_, index) => osc(index % 2 ? 783.99 : 659.25, 0.06, 0.012, {
      delay: index * 0.065,
      attack: 0.006,
    })),
  },
  {
    id: 'SFX-79',
    label: 'Quest Complete',
    voices: [
      ...[392, 523.25, 659.25].map((frequency, index) => osc(frequency, 0.1, 0.012, {
        delay: index * 0.09,
        type: 'square',
        filter: {
          type: 'lowpass',
          frequency: 2200,
        },
      })),
      osc(783.99, 0.45, 0.013, {
        delay: 0.27,
        attack: 0.01,
        type: 'square',
        filter: {
          type: 'lowpass',
          frequency: 2200,
        },
      }),
      osc(1567.98, 0.3, 0.005, {delay: 0.27}),
    ],
  },
  {
    id: 'SFX-80',
    label: 'Info Pop',
    voices: [
      osc(620, 0.06, 0.018, {endFrequency: 240}),
      osc(1320, 0.14, 0.01, {delay: 0.05}),
    ],
  },
  {
    id: 'SFX-81',
    label: 'Critical Alert',
    voices: repeat([
      osc(880, 0.12, 0.014, {
        type: 'square',
        filter: {
          type: 'lowpass',
          frequency: 1800,
        },
      }),
      osc(660, 0.12, 0.014, {
        delay: 0.13,
        type: 'square',
        filter: {
          type: 'lowpass',
          frequency: 1800,
        },
      }),
    ], [[0, 1], [0.3, 0.8]]),
  },
]

/** Archived candidates for quiet ambient hints and feedback. */
export const cueSoundEffects: Array<SoundEffect> = [
  {
    id: 'SFX-82',
    label: 'Soft Tick',
    voices: [
      osc(2100, 0.025, 0.007),
      noise(0.012, 0.003, {
        type: 'highpass',
        frequency: 7000,
      }),
    ],
  },
  {
    id: 'SFX-83',
    label: 'Breath In',
    voices: [
      noise(0.45, 0.008, {
        type: 'bandpass',
        frequency: 500,
        endFrequency: 1500,
        q: 0.6,
      }, {attack: 0.3}),
    ],
  },
  {
    id: 'SFX-84',
    label: 'Breath Out',
    voices: [
      noise(0.55, 0.008, {
        type: 'bandpass',
        frequency: 1400,
        endFrequency: 420,
        q: 0.6,
      }, {attack: 0.06}),
    ],
  },
  {
    id: 'SFX-85',
    label: 'Heartbeat',
    voices: repeat([
      osc(64, 0.14, 0.03, {endFrequency: 42}),
      noise(0.05, 0.008, {
        type: 'lowpass',
        frequency: 180,
      }),
    ], [[0, 1], [0.21, 0.72]]),
  },
  {
    id: 'SFX-86',
    label: 'Distant Shimmer',
    voices: [
      osc(2637.02, 0.7, 0.003, {attack: 0.2}),
      osc(3135.96, 0.6, 0.0025, {
        delay: 0.08,
        attack: 0.2,
      }),
      osc(3951.07, 0.5, 0.002, {
        delay: 0.16,
        attack: 0.18,
      }),
      noise(0.6, 0.002, {
        type: 'highpass',
        frequency: 8000,
      }, {attack: 0.25}),
    ],
  },
  {
    id: 'SFX-87',
    label: 'Proximity Hum',
    voices: [
      osc(110, 0.7, 0.01, {attack: 0.2}),
      osc(165, 0.7, 0.006, {attack: 0.24}),
      osc(220, 0.6, 0.002, {
        delay: 0.05,
        attack: 0.25,
      }),
    ],
  },
  {
    id: 'SFX-88',
    label: 'Hint Sparkle',
    voices: [
      osc(2349.32, 0.1, 0.006),
      osc(3135.96, 0.09, 0.005, {delay: 0.05}),
      osc(2793.83, 0.12, 0.005, {delay: 0.1}),
      osc(3729.31, 0.1, 0.003, {delay: 0.16}),
    ],
  },
  {
    id: 'SFX-89',
    label: 'Discovery Swell',
    voices: [
      osc(220, 0.6, 0.009, {
        endFrequency: 330,
        attack: 0.35,
      }),
      osc(330, 0.55, 0.006, {
        endFrequency: 495,
        delay: 0.05,
        attack: 0.35,
      }),
      noise(0.6, 0.004, {
        type: 'bandpass',
        frequency: 400,
        endFrequency: 2000,
        q: 0.7,
      }, {attack: 0.4}),
    ],
  },
  {
    id: 'SFX-90',
    label: 'Clock Tick Tock',
    voices: [
      noise(0.012, 0.008, {
        type: 'bandpass',
        frequency: 3200,
        q: 3,
      }),
      osc(1900, 0.02, 0.006),
      noise(0.014, 0.007, {
        type: 'bandpass',
        frequency: 2200,
        q: 3,
      }, {delay: 0.5}),
      osc(1400, 0.022, 0.005, {delay: 0.5}),
    ],
  },
  {
    id: 'SFX-91',
    label: 'Paper Rustle',
    voices: ([[2500, 0.06, 0, 0.007], [3500, 0.05, 0.07, 0.005], [1800, 0.08, 0.12, 0.006]] as const).map(([frequency, duration, delay, volume]) => noise(duration, volume, {
      type: 'bandpass',
      frequency,
      q: 1.2,
    }, {
      delay,
      attack: 0.015,
    })),
  },
  {
    id: 'SFX-92',
    label: 'Air Hush',
    voices: [
      noise(0.8, 0.004, {
        type: 'highpass',
        frequency: 4500,
      }, {attack: 0.35}),
    ],
  },
  {
    id: 'SFX-93',
    label: 'Dim Pulse',
    voices: [
      osc(196, 0.42, 0.011, {attack: 0.12}),
      osc(392, 0.32, 0.004, {
        delay: 0.02,
        attack: 0.1,
      }),
    ],
  },
]

/** Archived candidates for props and materials hitting each other. */
export const collisionSoundEffects: Array<SoundEffect> = [
  {
    id: 'SFX-94',
    label: 'Wood Knock',
    voices: [
      osc(220, 0.09, 0.024, {endFrequency: 190}),
      osc(587, 0.05, 0.01),
      noise(0.04, 0.014, {
        type: 'bandpass',
        frequency: 1100,
        q: 2.5,
      }),
    ],
  },
  {
    id: 'SFX-95',
    label: 'Metal Clang',
    voices: [
      ...struck(415, [
        [1, 1, 1],
        [2.76, 0.6, 0.75],
        [5.4, 0.35, 0.5],
        [8.93, 0.2, 0.3],
      ], 0.9, 0.016),
      noise(0.03, 0.012, {
        type: 'highpass',
        frequency: 3000,
      }),
    ],
  },
  {
    id: 'SFX-96',
    label: 'Glass Clink',
    voices: [
      ...struck(2900, [
        [1, 1, 1],
        [1.52, 0.6, 0.8],
        [2.31, 0.35, 0.55],
      ], 0.32, 0.012),
      noise(0.01, 0.006, {
        type: 'highpass',
        frequency: 6000,
      }),
    ],
  },
  {
    id: 'SFX-97',
    label: 'Stone Thud',
    voices: [
      osc(95, 0.2, 0.036, {endFrequency: 52}),
      noise(0.12, 0.02, {
        type: 'lowpass',
        frequency: 600,
        endFrequency: 160,
      }),
      osc(240, 0.05, 0.006, {
        endFrequency: 170,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-98',
    label: 'Plastic Clack',
    voices: [
      noise(0.035, 0.016, {
        type: 'bandpass',
        frequency: 2400,
        q: 2.2,
      }),
      osc(880, 0.04, 0.01, {
        endFrequency: 700,
        type: 'triangle',
      }),
      osc(1730, 0.025, 0.004),
    ],
  },
  {
    id: 'SFX-99',
    label: 'Ceramic Tap',
    voices: [
      ...struck(1680, [
        [1, 1, 1],
        [2.32, 0.5, 0.6],
        [3.73, 0.3, 0.4],
      ], 0.22, 0.014),
      noise(0.015, 0.008, {
        type: 'bandpass',
        frequency: 4000,
        q: 1.5,
      }),
    ],
  },
  {
    id: 'SFX-100',
    label: 'Cardboard Bump',
    voices: [
      noise(0.09, 0.016, {
        type: 'lowpass',
        frequency: 900,
        endFrequency: 300,
        q: 0.7,
      }),
      osc(150, 0.08, 0.016, {
        endFrequency: 105,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-101',
    label: 'Rubber Bounce',
    // Real bounces lose height, so the gaps shrink along with the level.
    voices: repeat([
      osc(240, 0.09, 0.024, {
        endFrequency: 150,
        type: 'triangle',
      }),
      noise(0.025, 0.006, {
        type: 'lowpass',
        frequency: 700,
      }),
    ], [[0, 1], [0.22, 0.6], [0.38, 0.36], [0.49, 0.2]]),
  },
  {
    id: 'SFX-102',
    label: 'Metal Scrape',
    voices: [
      noise(0.38, 0.03, {
        type: 'bandpass',
        frequency: 3200,
        endFrequency: 1700,
        q: 7,
      }, {attack: 0.04}),
      osc(1170, 0.34, 0.008, {
        endFrequency: 980,
        type: 'sawtooth',
        attack: 0.05,
        filter: {
          type: 'bandpass',
          frequency: 1200,
          q: 4,
        },
      }),
    ],
  },
  {
    id: 'SFX-103',
    label: 'Body Slam',
    voices: [
      osc(62, 0.32, 0.042, {endFrequency: 36}),
      noise(0.2, 0.026, {
        type: 'lowpass',
        frequency: 420,
        endFrequency: 110,
      }),
      osc(130, 0.1, 0.012, {
        endFrequency: 70,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-104',
    label: 'Pot Bonk',
    voices: [
      ...struck(310, [
        [1, 1, 1],
        [2.45, 0.45, 0.55],
        [4.1, 0.2, 0.35],
      ], 0.28, 0.022),
      noise(0.03, 0.01, {
        type: 'bandpass',
        frequency: 1300,
        q: 2,
      }),
    ],
  },
  {
    id: 'SFX-105',
    label: 'Frame Rattle',
    voices: repeat([
      noise(0.02, 0.024, {
        type: 'bandpass',
        frequency: 1900,
        q: 3,
      }),
      osc(620, 0.03, 0.01, {type: 'triangle'}),
    ], [[0, 1], [0.045, 0.7], [0.082, 0.5], [0.112, 0.32]]),
  },
]

export const soundEffectCandidates: Array<SoundEffect> = [
  ...menuSoundEffects,
  ...notificationSoundEffects,
  ...cueSoundEffects,
  ...collisionSoundEffects,
]
