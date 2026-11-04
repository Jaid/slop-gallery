import type {PoppingLantern} from '../gallery/fusion/effects/lanterns/flights.ts'
import type {PortalFrame} from '../gallery/fusion/portalFrame.ts'
import type {AudioOutput} from './proceduralAudio.ts'

import {offsetPosition} from '../gallery/fusion/effects/base/portalOffset.ts'
import {whiteNoise} from './ambience/base/noise.ts'
import EffectSound from './EffectSound.ts'

/**
 * The sound of jack-o’-lanterns popping out of the portal of `frame`, from now on, each heard from its spot: a hollow knock on its rind as it pops out, which together play a kooky tune, the soft whoomp of its candle catching, a twinkle when it winks and a breath blowing it out with a sinking sigh, over the faint crackle of the candles while they burn, all in a small, warm room.
 * It cleans up after itself once it has rung out.
 */
export default function playLanternGlee(output: AudioOutput, frame: PortalFrame, lanterns: ReadonlyArray<PoppingLantern>) {
  const sound = new EffectSound(output, frame.center, {
    brightness: 0.5,
    decay: 0.45,
    length: 1.8,
    wet: 0.32,
  })
  const {context, now} = sound
  for (const {blowOut, delay, pitch, spot, wink} of lanterns) {
    const panner = sound.pannerAt(offsetPosition(frame, spot))
    // Heard from its spot, and a little of it from the portal, where it rings in the room.
    const send = sound.keep(new GainNode(context, {gain: 1}))
    send.connect(panner)
    send.connect(sound.keep(new GainNode(context, {gain: 0.35}))).connect(sound.bus)
    const start = now + delay
    // A hollow knock: a soft tone and a woody overtone over a short thud of air.
    sound.tone(start, 0.32, {
      frequency: pitch,
      type: 'triangle',
      volume: 0.09,
      attack: 0.003,
    }, send)
    sound.tone(start, 0.12, {
      frequency: pitch * 2.42,
      volume: 0.03,
      attack: 0.002,
    }, send)
    sound.hiss(start, 0.07, {
      filter: {
        type: 'lowpass',
        frequency: 900,
      },
      volume: 0.08,
      attack: 0.002,
    }, send)
    sound.hiss(start + 0.12, 0.35, {
      filter: {
        type: 'lowpass',
        frequency: 260,
        end: 1500,
      },
      volume: 0.06,
      attack: 0.12,
    }, send)
    if (wink !== undefined) {
      for (const [index, ratio] of [4, 6].entries()) {
        sound.tone(now + wink + index * 0.06, 0.35, {
          frequency: pitch * ratio,
          volume: 0.025,
          attack: 0.002,
        }, send)
      }
    }
    sound.hiss(now + blowOut - 0.06, 0.3, {
      filter: {
        type: 'bandpass',
        frequency: 1300,
        q: 0.8,
      },
      volume: 0.11,
      attack: 0.05,
    }, send)
    sound.tone(now + blowOut, 0.3, {
      frequency: pitch * 2,
      end: pitch * 1.4,
      volume: 0.025,
      attack: 0.02,
    }, send)
  }
  // The candles crackle faintly while they burn.
  const burning = Math.max(...lanterns.map(({blowOut}) => blowOut))
  const crackling = sound.hiss(now + 0.3, burning - 0.3, {
    filter: {
      type: 'bandpass',
      frequency: 2600,
      q: 1.2,
    },
    volume: 0.05,
    attack: 0.3,
    hold: burning - 0.9,
  })
  const crackle = sound.keep(new GainNode(context, {gain: 0}))
  crackling.filter.disconnect()
  crackling.filter.connect(crackle).connect(crackling.envelope)
  const sparks = sound.keep(new AudioBufferSourceNode(context, {buffer: whiteNoise(context)}))
  const sparkFilter = sound.keep(new BiquadFilterNode(context, {
    type: 'lowpass',
    frequency: 60,
  }))
  const sparkAmount = sound.keep(new GainNode(context, {gain: 9}))
  sparks.connect(sparkFilter).connect(sparkAmount).connect(crackle.gain)
  sparks.start(now + 0.3, Math.random() * 3)
  sparks.stop(now + burning + 0.05)
  sound.finish(2)
}
