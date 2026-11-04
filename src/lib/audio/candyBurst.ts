import type {FlungTreat} from '../gallery/fusion/effects/candy/flights.ts'
import type {PortalFrame} from '../gallery/fusion/portalFrame.ts'
import type {AudioOutput} from './proceduralAudio.ts'

import {offsetPosition} from '../gallery/fusion/effects/base/portalOffset.ts'
import {candyLanding} from '../gallery/fusion/effects/candy/flights.ts'
import {whiteNoise} from './ambience/base/noise.ts'
import EffectSound from './EffectSound.ts'

/** the glockenspiel’s run as the treats fly: up through A minor and down a step to land on its fifth, in hertz */
const run = [880, 1046.5, 1318.51, 1760, 1661.22, 1318.51]
/** the tones a glockenspiel bar rings, as multiples of its pitch with their share of its volume and how long they ring */
const barPartials = [[1, 1, 0.9], [2.76, 0.32, 0.35], [5.4, 0.12, 0.15]] as const
/** where along the wall the clatter of the candies landing is heard from, in meters, for the candies landing nearest to each */
const clatterSpots = [-1, 0, 1]

/**
 * The sound of Halloween treats bursting out of the portal of `frame` like out of a party popper, from now on: the popper’s crack and thump, the rustle of the confetti fluttering down, a glockenspiel’s playful run and the clatter of every candy landing on the floor, where it lands, and again, softer, where it hops to rest.
 * It cleans up after itself once it has rung out.
 */
export default function playCandyBurst(output: AudioOutput, frame: PortalFrame, treats: ReadonlyArray<FlungTreat>) {
  const sound = new EffectSound(output, frame.center, {
    brightness: 0.8,
    decay: 0.4,
    length: 1.6,
    wet: 0.3,
  })
  const {context, now} = sound
  sound.hiss(now, 0.06, {
    filter: {
      type: 'highpass',
      frequency: 1400,
    },
    volume: 0.1,
    attack: 0.001,
  })
  sound.tone(now, 0.2, {
    frequency: 190,
    end: 55,
    volume: 0.1,
    attack: 0.002,
  })
  // The confetti rustles while it flutters down, crackling irregularly.
  const rustle = sound.hiss(now + 0.03, 2.6, {
    filter: {
      type: 'bandpass',
      frequency: 3800,
      q: 0.7,
    },
    volume: 0.035,
    attack: 0.08,
    hold: 0.3,
  })
  const crackle = sound.keep(new GainNode(context, {gain: 0.4}))
  rustle.filter.disconnect()
  rustle.filter.connect(crackle).connect(rustle.envelope)
  const jitter = sound.keep(new AudioBufferSourceNode(context, {buffer: whiteNoise(context)}))
  const jitterFilter = sound.keep(new BiquadFilterNode(context, {
    type: 'lowpass',
    frequency: 35,
  }))
  const jitterAmount = sound.keep(new GainNode(context, {gain: 4}))
  jitter.connect(jitterFilter).connect(jitterAmount).connect(crackle.gain)
  jitter.start(now, Math.random() * 3)
  jitter.stop(now + 2.7)
  sound.glide(offsetPosition(frame, [0, -0.8, 0.8]), now + 2.6)
  for (const [index, pitch] of run.entries()) {
    const start = now + 0.07 + index * 0.075
    for (const [ratio, share, ring] of barPartials) {
      sound.tone(start, ring * (index === run.length - 1 ? 1.8 : 1), {
        frequency: pitch * ratio,
        volume: 0.03 * share,
        attack: 0.002,
      })
    }
  }
  const panners = clatterSpots.map(along => sound.pannerAt(offsetPosition(frame, [along, frame.floor - frame.center[1], 0.9])))
  const floor = frame.floor - frame.center[1]
  for (const treat of treats) {
    if (treat.kind === 'confetti') {
      continue
    }
    const {hop, landing} = candyLanding(treat, floor)
    const travel = treat.velocity[0] * landing
    const panner = panners[travel < -0.5 ? 0 : (travel > 0.5 ? 2 : 1)]
    const loudness = treat.size / 0.08
    for (const [at, volume] of [[landing, 0.016], [landing + hop, 0.006]] as const) {
      const start = now + treat.delay + at
      sound.tone(start, 0.018, {
        frequency: 2600 + treat.phase * 2200,
        type: 'triangle',
        volume: volume * loudness,
        attack: 0.001,
      }, panner)
      sound.hiss(start, 0.025, {
        filter: {
          type: 'highpass',
          frequency: 3000,
        },
        volume: volume * loudness * 0.6,
        attack: 0.001,
      }, panner)
    }
  }
  sound.finish(2)
}
