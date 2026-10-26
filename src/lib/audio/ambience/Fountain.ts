import type {Vec3} from '../../gallery/types.ts'
import type {NoiseBed} from './base/AmbienceEmitter.ts'
import type {Range} from './base/noise.ts'

import fountain from '../../gallery/fountain/config.ts'
import AmbienceEmitter from './base/AmbienceEmitter.ts'

/** single bubbles: a sine whose pitch rises as it decays, like an air pocket closing under water */
const drops = {
  rate: 18,
  frequency: [500, 2200] as Range,
  /** factor the pitch rises by */
  rise: [1.4, 2.6] as Range,
  duration: [0.02, 0.06] as Range,
  volume: [0.03, 0.08] as Range,
}
/** a soft hiss: a band of noise over a low murmur */
const beds: ReadonlyArray<NoiseBed> = [
  {
    filter: 'bandpass',
    frequency: 1900,
    q: 1.3,
    volume: 0.04,
    sway: [6, 0.5],
  },
  {
    filter: 'lowpass',
    frequency: 350,
    volume: 0.05,
    sway: [1.5, 0.35],
  },
]
/** short bursts of noise, like water hitting water */
const splashes = {
  rate: 1.5,
  frequency: [2500, 5000] as Range,
  q: 2,
  duration: [0.03, 0.06] as Range,
  volume: [0.015, 0.03] as Range,
}

/** The Lobby fountain’s quiet trickle: a soft hiss under lots of single bubbles, sounding from the tip of its finial. */
export default class Fountain extends AmbienceEmitter {
  /** sounds from `position`, by default the finial’s tip, the main jet’s mouth */
  constructor(position: Vec3 = [fountain.position[0], fountain.position[1] + fountain.jet.y, fountain.position[2]]) {
    super({
      id: 'lobby-fountain',
      title: 'Fountain',
      position,
      hearing: {
        near: 1,
        // still faintly audible from the Lobby’s far north end, about 18 m away
        far: 21,
      },
      gain: 0.3,
      rooms: ['lobby'],
    })
  }

  protected override get beds() {
    return beds
  }

  protected override schedule(from: number, until: number) {
    for (const time of this.scatter(drops.rate, from, until)) {
      const frequency = this.vary(drops.frequency)
      this.chirp(time, this.vary(drops.duration), this.vary(drops.volume), frequency, frequency * this.vary(drops.rise))
    }
    for (const time of this.scatter(splashes.rate, from, until)) {
      this.burst(time, this.vary(splashes.duration), this.vary(splashes.volume), this.vary(splashes.frequency), splashes.q)
    }
  }
}
