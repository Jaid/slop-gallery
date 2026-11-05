import type {SoundEffect, Voice} from './proceduralAudio.ts'

import {noise, osc} from './proceduralAudio.ts'

/**
 * An old push-button light switch: the pressed button goes in with a snap of its spring and a knock of the Bakelite body, the other one pops out a moment later, lighter. Switching on, the lights hum up briefly; switching off, the hum drops away. Off sounds a little lower than on.
 */
function pushButtonVoices(on: boolean): Array<Voice> {
  const pitch = on ? 1 : 0.86
  return [
    noise(0.004, 0.11, {
      type: 'bandpass',
      frequency: 3200 * pitch,
      q: 1.8,
    }, {attack: 0.0004}),
    osc(430 * pitch, 0.045, 0.034, {
      endFrequency: 310 * pitch,
      attack: 0.001,
    }),
    osc(1850 * pitch, 0.03, 0.009),
    noise(0.02, 0.022, {
      type: 'bandpass',
      frequency: 1200,
      q: 1,
    }, {delay: 0.004}),
    // The other button pops out.
    noise(0.003, 0.06, {
      type: 'bandpass',
      frequency: 4600 * pitch,
      q: 2,
    }, {
      attack: 0.0003,
      delay: 0.032,
    }),
    osc(640 * pitch, 0.03, 0.017, {
      endFrequency: 520 * pitch,
      delay: 0.032,
    }),
    osc(2350 * pitch, 0.11, 0.003, {delay: 0.034}),
    ...on ? [
      noise(0.002, 0.03, {
        type: 'highpass',
        frequency: 3000,
      }, {
        attack: 0.0003,
        delay: 0.06,
      }),
      osc(100, 0.45, 0.006, {
        attack: 0.08,
        delay: 0.06,
      }),
      osc(200, 0.35, 0.003, {
        attack: 0.08,
        delay: 0.06,
      }),
    ] : [
      osc(100, 0.22, 0.005, {
        endFrequency: 70,
        attack: 0.005,
        delay: 0.03,
      }),
    ],
  ]
}

/** the switches’ sounds, in the catalog besides the interface’s */
export const switchSoundEffects = {
  lightOn: {
    id: 'SFX-45',
    label: 'Push Button On',
    voices: pushButtonVoices(true),
  },
  lightOff: {
    id: 'SFX-46',
    label: 'Push Button Off',
    voices: pushButtonVoices(false),
  },
  // An enameled selector button: lighter than the light switch, its detent clicking before the last button pops out.
  selector: {
    id: 'SFX-47',
    label: 'Selector Button',
    voices: [
      noise(0.003, 0.09, {
        type: 'bandpass',
        frequency: 3900,
        q: 2,
      }, {attack: 0.0004}),
      osc(560, 0.035, 0.026, {endFrequency: 420}),
      noise(0.002, 0.04, {
        type: 'bandpass',
        frequency: 5200,
        q: 2,
      }, {
        attack: 0.0003,
        delay: 0.012,
      }),
      noise(0.003, 0.055, {
        type: 'bandpass',
        frequency: 4800,
        q: 2,
      }, {
        attack: 0.0003,
        delay: 0.028,
      }),
      osc(700, 0.025, 0.014, {
        endFrequency: 600,
        delay: 0.028,
      }),
    ],
  },
  // The orb release: the button snaps in against its spring and knocks home, the catch overhead lets go with a dull clack, and the button springs back out.
  release: {
    id: 'SFX-48',
    label: 'Release Button',
    voices: [
      noise(0.004, 0.12, {
        type: 'bandpass',
        frequency: 3000,
        q: 1.8,
      }, {attack: 0.0004}),
      osc(380, 0.05, 0.036, {
        endFrequency: 280,
        attack: 0.001,
      }),
      noise(0.012, 0.05, {
        type: 'lowpass',
        frequency: 900,
      }, {delay: 0.05}),
      osc(160, 0.12, 0.03, {
        endFrequency: 110,
        attack: 0.002,
        delay: 0.05,
      }),
      noise(0.003, 0.06, {
        type: 'bandpass',
        frequency: 4400,
        q: 2,
      }, {
        attack: 0.0003,
        delay: 0.18,
      }),
      osc(620, 0.03, 0.016, {
        endFrequency: 500,
        delay: 0.18,
      }),
    ],
  },
  // Locked while an orb is still on its way: the button gives a millimeter and knocks against its stop.
  releaseLocked: {
    id: 'SFX-49',
    label: 'Release Button Locked',
    voices: [
      noise(0.003, 0.07, {
        type: 'bandpass',
        frequency: 2600,
        q: 1.6,
      }, {attack: 0.0004}),
      osc(300, 0.035, 0.022, {endFrequency: 240}),
    ],
  },
} satisfies Record<string, SoundEffect>
