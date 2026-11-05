import type {FrameImpactSoundId} from './frameImpacts.ts'
import type {Voice} from './proceduralAudio.ts'

import {frameImpactVoices} from './frameImpacts.ts'
import {noise, shiftVoices} from './proceduralAudio.ts'

/** how fast a work strikes its wall as its hanging slaps it there, in m/s, for the loudness of its strike */
const slapSpeed = 6

/**
 * A work slapped onto its wall as it hangs: the swing of the arm rising into the strike `impact` seconds after the work left the player’s hands, then its frame’s stuff slapping down flat like a loose work falling flat, gilt bright, hardwood round and stone or metal dull, as `sound` says, and the frame rattling twice on its hook.
 * `variation` (−1–1) tunes it a little apart, so hanging after hanging never sounds alike.
 */
export default function hangingVoices({impact, sound, variation}: {
  impact: number
  sound: FrameImpactSoundId
  variation: number
}): Array<Voice> {
  const rattle = (delay: number, frequency: number, volume: number) => noise(0.02, volume, {
    type: 'bandpass',
    frequency: frequency * (1 + variation * 0.05),
    q: 4,
  }, {
    attack: 0.0005,
    delay: impact + delay,
  })
  return [
    noise(impact, 0.022, {
      type: 'bandpass',
      frequency: 450,
      endFrequency: 2000,
      q: 0.9,
    }, {attack: impact * 0.85}),
    ...shiftVoices(frameImpactVoices('flat', slapSpeed, sound, variation), impact),
    rattle(0.075, 3300, 0.03),
    rattle(0.15, 2900, 0.018),
  ]
}
