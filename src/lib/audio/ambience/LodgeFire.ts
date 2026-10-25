import type {NoiseBed} from './base/AmbienceEmitter.ts'
import type {Range} from './base/noise.ts'

import {fireWorldOrigin} from '../../gallery/fireplace/config.ts'
import AmbienceEmitter from './base/AmbienceEmitter.ts'

/** a quiet glow: a steeply filtered low roar with a faint mid-range breath */
const beds: ReadonlyArray<NoiseBed> = [
  {
    filter: 'lowpass',
    frequency: 260,
    stages: 3,
    volume: 0.05,
    sway: [0.6, 0.5],
  },
  {
    filter: 'bandpass',
    frequency: 900,
    q: 0.8,
    stages: 2,
    volume: 0.004,
    sway: [0.5, 0.7],
  },
]
/** sparse bursts of fine ticks, like embers splitting in the heat */
const crackles = {
  /** bursts per second */
  rate: 1.5,
  /** ticks per burst */
  count: [1, 2] as Range,
  /** seconds one burst spreads its ticks over */
  spread: 0.08,
  frequency: [3000, 8000] as Range,
  duration: [0.002, 0.006] as Range,
  volume: [0.02, 0.08] as Range,
}

/** The Lodge’s log fire burning low: a soft glow under sparse fine crackles, sounding from just above the logs. */
export default class LodgeFire extends AmbienceEmitter {
  constructor() {
    super({
      id: 'lodge-fire',
      title: 'Lodge fire',
      position: [fireWorldOrigin[0], fireWorldOrigin[1] + 0.6, fireWorldOrigin[2]],
      hearing: {
        near: 1,
        far: 14,
      },
      gain: 0.3,
      rooms: ['lodge'],
    })
  }

  protected override get beds() {
    return beds
  }

  protected override schedule(from: number, until: number) {
    for (const time of this.scatter(crackles.rate, from, until)) {
      const count = Math.round(this.vary(crackles.count))
      for (let i = 0; i < count; i++) {
        // Mostly faint ticks with the occasional sharp one.
        const volume = crackles.volume[0] + (crackles.volume[1] - crackles.volume[0]) * Math.random() ** 3
        this.burst(time + Math.random() * crackles.spread, this.vary(crackles.duration), volume, this.vary(crackles.frequency), 0.8)
      }
    }
  }
}
