import type {AudioOutput, SoundEffect} from './proceduralAudio.ts'

import {playerSoundEffects} from './playerSoundEffects.ts'
import {noise, osc, playVoices} from './proceduralAudio.ts'

export type {SoundEffect} from './proceduralAudio.ts'

export const soundEffects: Array<SoundEffect> = [
  {
    id: 'SFX-01',
    label: 'Pebble Click',
    voices: [
      noise(0.045, 0.022, {
        type: 'highpass',
        frequency: 3200,
      }),
      osc(760, 0.055, 0.026, {
        endFrequency: 390,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-02',
    label: 'Bubble Pop',
    voices: [
      osc(410, 0.14, 0.042, {endFrequency: 115}),
      osc(160, 0.09, 0.02, {
        endFrequency: 72,
        delay: 0.025,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-03',
    label: 'Glass Tick',
    voices: [
      osc(2350, 0.12, 0.022, {endFrequency: 1860}),
      osc(3520, 0.095, 0.013, {
        endFrequency: 2750,
        delay: 0.008,
      }),
    ],
  },
  {
    id: 'SFX-04',
    label: 'Soft Confirm',
    voices: [
      osc(523.25, 0.16, 0.026),
      osc(783.99, 0.2, 0.028, {delay: 0.075}),
    ],
  },
  {
    id: 'SFX-05',
    label: 'Wrong Way',
    voices: [
      osc(246.94, 0.14, 0.026, {
        endFrequency: 220,
        type: 'square',
      }),
      osc(185, 0.2, 0.027, {
        endFrequency: 138,
        delay: 0.09,
        type: 'square',
      }),
    ],
  },
  {
    id: 'SFX-06',
    label: 'Coin Spark',
    voices: [
      osc(987.77, 0.09, 0.021, {type: 'square'}),
      osc(1479.98, 0.11, 0.022, {
        delay: 0.055,
        type: 'square',
      }),
      osc(1975.53, 0.18, 0.018, {delay: 0.11}),
    ],
  },
  {
    id: 'SFX-07',
    label: 'Crystal Ping',
    voices: [
      osc(1318.51, 0.55, 0.022),
      osc(1977.77, 0.42, 0.015, {delay: 0.006}),
      osc(2637.02, 0.32, 0.01, {delay: 0.014}),
    ],
  },
  {
    id: 'SFX-08',
    label: 'Tiny Bell',
    voices: [
      osc(880, 0.72, 0.021),
      osc(1760, 0.54, 0.013, {delay: 0.004}),
      osc(2640, 0.4, 0.008, {delay: 0.01}),
    ],
  },
  {
    id: 'SFX-09',
    label: 'Chime Rise',
    voices: [
      osc(392, 0.18, 0.022),
      osc(523.25, 0.2, 0.022, {delay: 0.075}),
      osc(659.25, 0.22, 0.022, {delay: 0.15}),
      osc(783.99, 0.3, 0.024, {delay: 0.225}),
    ],
  },
  {
    id: 'SFX-10',
    label: 'Chime Fall',
    voices: [
      osc(783.99, 0.18, 0.022),
      osc(659.25, 0.2, 0.022, {delay: 0.075}),
      osc(523.25, 0.22, 0.022, {delay: 0.15}),
      osc(392, 0.3, 0.024, {delay: 0.225}),
    ],
  },
  {
    id: 'SFX-11',
    label: 'Laser Pew',
    voices: [
      osc(1320, 0.24, 0.034, {
        endFrequency: 92,
        type: 'sawtooth',
      }),
      osc(660, 0.19, 0.015, {
        endFrequency: 70,
        delay: 0.012,
        type: 'square',
      }),
    ],
  },
  {
    id: 'SFX-12',
    label: 'Plasma Zap',
    voices: [
      osc(1680, 0.16, 0.025, {
        endFrequency: 210,
        type: 'square',
      }),
      noise(0.13, 0.026, {
        type: 'bandpass',
        frequency: 1900,
        endFrequency: 380,
        q: 4,
      }),
    ],
  },
  {
    id: 'SFX-13',
    label: 'Scanner Chirp',
    voices: [
      osc(420, 0.16, 0.024, {
        endFrequency: 1640,
        type: 'triangle',
      }),
      osc(1640, 0.18, 0.022, {
        endFrequency: 690,
        delay: 0.17,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-14',
    label: 'Sonar Pulse',
    voices: [
      osc(659.25, 0.8, 0.025, {attack: 0.01}),
      osc(1318.51, 0.52, 0.009, {attack: 0.008}),
    ],
  },
  {
    id: 'SFX-15',
    label: 'Portal Bloom',
    voices: [
      osc(92, 0.82, 0.025, {endFrequency: 330}),
      osc(184, 0.72, 0.022, {
        endFrequency: 760,
        delay: 0.035,
        type: 'triangle',
      }),
      noise(0.5, 0.012, {
        type: 'bandpass',
        frequency: 420,
        endFrequency: 2600,
        q: 1.2,
      }, {
        delay: 0.12,
        attack: 0.08,
      }),
    ],
  },
  {
    id: 'SFX-16',
    label: 'Power Up',
    voices: [
      osc(110, 0.58, 0.026, {
        endFrequency: 880,
        type: 'sawtooth',
      }),
      osc(220, 0.46, 0.017, {
        endFrequency: 1760,
        delay: 0.08,
        type: 'triangle',
      }),
      osc(1760, 0.22, 0.018, {delay: 0.56}),
    ],
  },
  {
    id: 'SFX-17',
    label: 'Power Down',
    voices: [
      osc(820, 0.66, 0.027, {
        endFrequency: 72,
        type: 'sawtooth',
      }),
      osc(240, 0.56, 0.018, {
        endFrequency: 48,
        delay: 0.06,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-18',
    label: 'UI Sweep',
    voices: [
      osc(290, 0.19, 0.022, {
        endFrequency: 1850,
        type: 'triangle',
      }),
      osc(1850, 0.15, 0.018, {
        endFrequency: 920,
        delay: 0.2,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-19',
    label: 'Air Whoosh',
    voices: [
      noise(0.23, 0.022, {
        type: 'bandpass',
        frequency: 450,
        endFrequency: 4200,
        q: 0.7,
      }, {attack: 0.05}),
      noise(0.28, 0.017, {
        type: 'bandpass',
        frequency: 4200,
        endFrequency: 700,
        q: 0.8,
      }, {
        delay: 0.2,
        attack: 0.025,
      }),
    ],
  },
  {
    id: 'SFX-20',
    label: 'Wind Puff',
    voices: [
      noise(0.48, 0.025, {
        type: 'bandpass',
        frequency: 1150,
        endFrequency: 310,
        q: 0.6,
      }, {attack: 0.055}),
      noise(0.32, 0.01, {
        type: 'highpass',
        frequency: 3400,
      }, {
        delay: 0.025,
        attack: 0.04,
      }),
    ],
  },
  {
    id: 'SFX-21',
    label: 'Bass Thump',
    voices: [
      osc(128, 0.34, 0.045, {endFrequency: 41}),
      noise(0.085, 0.016, {
        type: 'lowpass',
        frequency: 520,
        endFrequency: 160,
      }),
    ],
  },
  {
    id: 'SFX-22',
    label: 'Rumble Hit',
    voices: [
      osc(68, 0.62, 0.035, {endFrequency: 37}),
      noise(0.72, 0.024, {
        type: 'lowpass',
        frequency: 240,
        endFrequency: 95,
        q: 0.5,
      }, {attack: 0.01}),
    ],
  },
  {
    id: 'SFX-23',
    label: 'Kick Knock',
    voices: [
      osc(165, 0.16, 0.042, {endFrequency: 49}),
      noise(0.045, 0.02, {
        type: 'lowpass',
        frequency: 980,
        endFrequency: 320,
      }),
    ],
  },
  {
    id: 'SFX-24',
    label: 'Snare Snap',
    voices: [
      noise(0.16, 0.032, {
        type: 'bandpass',
        frequency: 2100,
        endFrequency: 1200,
        q: 0.8,
      }),
      osc(230, 0.11, 0.016, {
        endFrequency: 118,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-25',
    label: 'Hat Tick',
    voices: [
      noise(0.065, 0.027, {
        type: 'highpass',
        frequency: 7200,
      }),
      noise(0.035, 0.011, {
        type: 'bandpass',
        frequency: 11_000,
        q: 2,
      }, {delay: 0.006}),
    ],
  },
  {
    id: 'SFX-26',
    label: 'Glitch Bite',
    voices: [
      osc(430, 0.045, 0.025, {
        endFrequency: 860,
        type: 'square',
      }),
      osc(1240, 0.052, 0.027, {
        endFrequency: 310,
        delay: 0.058,
        type: 'square',
      }),
      noise(0.075, 0.019, {
        type: 'bandpass',
        frequency: 3400,
        q: 5,
      }, {delay: 0.116}),
    ],
  },
  {
    id: 'SFX-27',
    label: 'Robot Chirp',
    voices: [
      osc(330, 0.08, 0.022, {
        endFrequency: 390,
        type: 'square',
      }),
      osc(495, 0.08, 0.022, {
        endFrequency: 560,
        delay: 0.09,
        type: 'square',
      }),
      osc(660, 0.11, 0.022, {
        endFrequency: 760,
        delay: 0.18,
        type: 'square',
      }),
    ],
  },
  {
    id: 'SFX-28',
    label: 'Water Drip',
    voices: [
      osc(1080, 0.13, 0.023, {endFrequency: 1640}),
      osc(1720, 0.16, 0.017, {
        endFrequency: 930,
        delay: 0.045,
      }),
    ],
  },
  {
    id: 'SFX-29',
    label: 'Spring Boing',
    voices: [
      osc(190, 0.48, 0.034, {
        endFrequency: 94,
        type: 'triangle',
      }),
      osc(380, 0.36, 0.016, {
        endFrequency: 188,
        delay: 0.01,
        type: 'triangle',
      }),
      osc(570, 0.24, 0.009, {
        endFrequency: 282,
        delay: 0.02,
      }),
    ],
  },
  {
    id: 'SFX-30',
    label: 'Alarm Nudge',
    voices: [
      osc(620, 0.095, 0.022, {type: 'square'}),
      osc(465, 0.095, 0.022, {
        delay: 0.105,
        type: 'square',
      }),
      osc(620, 0.095, 0.022, {
        delay: 0.21,
        type: 'square',
      }),
      osc(465, 0.13, 0.022, {
        delay: 0.315,
        type: 'square',
      }),
    ],
  },
  ...Object.values(playerSoundEffects),
  {
    id: 'SFX-38',
    label: 'Menu Open',
    voices: [
      osc(330, 0.16, 0.018, {
        endFrequency: 620,
        type: 'triangle',
        attack: 0.025,
      }),
      noise(0.12, 0.009, {
        type: 'bandpass',
        frequency: 650,
        endFrequency: 1800,
        q: 0.7,
      }, {attack: 0.035}),
    ],
  },
  {
    id: 'SFX-39',
    label: 'Menu Close',
    voices: [
      osc(620, 0.15, 0.018, {
        endFrequency: 280,
        type: 'triangle',
        attack: 0.02,
      }),
      noise(0.11, 0.008, {
        type: 'bandpass',
        frequency: 1700,
        endFrequency: 520,
        q: 0.7,
      }, {attack: 0.025}),
    ],
  },
  {
    id: 'SFX-40',
    label: 'Hover Tick',
    voices: [
      osc(940, 0.055, 0.014, {
        endFrequency: 720,
        type: 'sine',
      }),
      noise(0.035, 0.006, {
        type: 'highpass',
        frequency: 4200,
      }),
    ],
  },
  {
    id: 'SFX-41',
    label: 'Selection Step',
    voices: [
      osc(440, 0.075, 0.016, {type: 'triangle'}),
      osc(587.33, 0.09, 0.014, {
        delay: 0.055,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-42',
    label: 'Toggle On',
    voices: [
      osc(180, 0.065, 0.018, {
        endFrequency: 120,
        type: 'triangle',
      }),
      osc(660, 0.13, 0.017, {
        delay: 0.035,
        endFrequency: 920,
      }),
    ],
  },
  {
    id: 'SFX-43',
    label: 'Toggle Off',
    voices: [
      osc(180, 0.065, 0.018, {
        endFrequency: 110,
        type: 'triangle',
      }),
      osc(720, 0.13, 0.016, {
        delay: 0.035,
        endFrequency: 390,
      }),
    ],
  },
  {
    id: 'SFX-44',
    label: 'Unlock',
    voices: [
      osc(392, 0.11, 0.017, {type: 'triangle'}),
      osc(587.33, 0.13, 0.017, {
        delay: 0.07,
        type: 'triangle',
      }),
      osc(880, 0.2, 0.016, {delay: 0.14}),
    ],
  },
  {
    id: 'SFX-45',
    label: 'Lock',
    voices: [
      osc(420, 0.11, 0.018, {
        endFrequency: 250,
        type: 'triangle',
      }),
      osc(145, 0.15, 0.018, {
        delay: 0.065,
        endFrequency: 82,
      }),
      noise(0.045, 0.008, {
        type: 'lowpass',
        frequency: 620,
        endFrequency: 240,
      }, {delay: 0.055}),
    ],
  },
  {
    id: 'SFX-46',
    label: 'Item Pickup',
    voices: [
      osc(620, 0.09, 0.016, {
        endFrequency: 920,
        type: 'triangle',
      }),
      osc(1240, 0.16, 0.014, {
        delay: 0.055,
        endFrequency: 1680,
      }),
      noise(0.055, 0.006, {
        type: 'highpass',
        frequency: 5200,
      }, {delay: 0.075}),
    ],
  },
  {
    id: 'SFX-47',
    label: 'Item Drop',
    voices: [
      osc(170, 0.13, 0.022, {endFrequency: 72}),
      noise(0.075, 0.011, {
        type: 'lowpass',
        frequency: 850,
        endFrequency: 250,
      }),
      osc(310, 0.07, 0.008, {
        delay: 0.035,
        endFrequency: 180,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-48',
    label: 'Objective Update',
    voices: [
      osc(349.23, 0.14, 0.016, {type: 'triangle'}),
      osc(523.25, 0.17, 0.017, {
        delay: 0.085,
        type: 'triangle',
      }),
      osc(698.46, 0.24, 0.016, {delay: 0.17}),
    ],
  },
  {
    id: 'SFX-49',
    label: 'Achievement Glow',
    voices: [
      osc(261.63, 0.34, 0.015, {attack: 0.025}),
      osc(392, 0.38, 0.015, {
        delay: 0.06,
        attack: 0.025,
      }),
      osc(659.25, 0.46, 0.014, {
        delay: 0.12,
        attack: 0.03,
      }),
      osc(1046.5, 0.32, 0.009, {
        delay: 0.22,
        attack: 0.02,
      }),
    ],
  },
  {
    id: 'SFX-50',
    label: 'Warning Pulse',
    voices: [
      osc(330, 0.13, 0.021, {
        type: 'square',
        filter: {
          type: 'lowpass',
          frequency: 1300,
        },
      }),
      osc(330, 0.16, 0.021, {
        delay: 0.19,
        type: 'square',
        filter: {
          type: 'lowpass',
          frequency: 1300,
        },
      }),
    ],
  },
  {
    id: 'SFX-51',
    label: 'Error Soft',
    voices: [
      osc(392, 0.15, 0.018, {
        endFrequency: 330,
        type: 'triangle',
      }),
      osc(277.18, 0.22, 0.019, {
        delay: 0.085,
        endFrequency: 220,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-52',
    label: 'Door Latch',
    voices: [
      noise(0.04, 0.013, {
        type: 'bandpass',
        frequency: 2200,
        endFrequency: 900,
        q: 1.4,
      }),
      osc(210, 0.09, 0.019, {
        delay: 0.018,
        endFrequency: 92,
        type: 'triangle',
      }),
      osc(780, 0.045, 0.007, {
        delay: 0.04,
        endFrequency: 510,
      }),
    ],
  },
  {
    id: 'SFX-53',
    label: 'Heavy Mechanism',
    voices: [
      osc(82, 0.32, 0.032, {
        endFrequency: 44,
        attack: 0.012,
      }),
      noise(0.2, 0.018, {
        type: 'lowpass',
        frequency: 520,
        endFrequency: 130,
      }, {attack: 0.018}),
      osc(190, 0.12, 0.011, {
        delay: 0.08,
        endFrequency: 105,
        type: 'triangle',
      }),
    ],
  },
  {
    id: 'SFX-54',
    label: 'Servo Move',
    voices: [
      osc(230, 0.25, 0.015, {
        endFrequency: 880,
        type: 'sawtooth',
        filter: {
          type: 'lowpass',
          frequency: 1600,
        },
      }),
      noise(0.22, 0.008, {
        type: 'bandpass',
        frequency: 720,
        endFrequency: 2100,
        q: 1.2,
      }, {attack: 0.045}),
    ],
  },
  {
    id: 'SFX-55',
    label: 'Camera Shutter',
    voices: [
      noise(0.025, 0.019, {
        type: 'bandpass',
        frequency: 2600,
        q: 1.4,
      }),
      osc(240, 0.045, 0.014, {
        delay: 0.018,
        endFrequency: 130,
        type: 'triangle',
      }),
      noise(0.028, 0.016, {
        type: 'highpass',
        frequency: 3800,
      }, {delay: 0.055}),
    ],
  },
  {
    id: 'SFX-56',
    label: 'Page Flick',
    voices: [
      noise(0.16, 0.012, {
        type: 'bandpass',
        frequency: 1250,
        endFrequency: 4300,
        q: 0.55,
      }, {attack: 0.045}),
      noise(0.11, 0.007, {
        type: 'highpass',
        frequency: 5000,
      }, {
        delay: 0.055,
        attack: 0.02,
      }),
    ],
  },
  {
    id: 'SFX-57',
    label: 'Phase Shift',
    voices: [
      noise(0.28, 0.012, {
        type: 'bandpass',
        frequency: 380,
        endFrequency: 3200,
        q: 0.75,
      }, {attack: 0.07}),
      osc(185, 0.3, 0.016, {
        endFrequency: 740,
        type: 'triangle',
        attack: 0.045,
      }),
      osc(1110, 0.18, 0.009, {
        delay: 0.16,
        endFrequency: 555,
        attack: 0.03,
      }),
    ],
  },
]

const byId = new Map(soundEffects.map(effect => [effect.id, effect]))

/** Preferred effects captured from the in-world audition, in selection order. */
export const enabledSoundEffectIds: ReadonlyArray<string> = [
  'SFX-28',
  'SFX-07',
  'SFX-04',
  'SFX-02',
  'SFX-08',
  'SFX-14',
  'SFX-23',
  'SFX-29',
  'SFX-09',
  'SFX-06',
  'SFX-03',
  ...Object.values(playerSoundEffects).map(effect => effect.id),
]

export const enabledSoundEffects = enabledSoundEffectIds.map(id => byId.get(id)!)
const enabledIds = new Set<string>(enabledSoundEffectIds)
export const archivedSoundEffects = soundEffects.filter(effect => !enabledIds.has(effect.id))
export function playSoundEffect(sound: AudioOutput, id: string) {
  const effect = byId.get(id)
  if (!effect) {
    return false
  }
  playVoices(sound, effect.voices, id)
  return true
}
