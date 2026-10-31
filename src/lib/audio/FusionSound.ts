import type {Vec3} from '../gallery/types.ts'
import type {AudioOutput} from './proceduralAudio.ts'

import {whiteNoise} from './ambience/base/noise.ts'

type Tone = {
  attack?: number
  /** the frequency it glides to by its end, exponentially */
  end?: number
  frequency: number
  type?: OscillatorType
  /** a slow vibrato: how many hertz it swings and how many times a second */
  vibrato?: readonly [depth: number, rate: number]
  volume: number
}
type Hiss = {
  attack?: number
  /** the filter’s frequency by the hiss’s end, exponentially */
  end?: number
  filter: BiquadFilterType
  frequency: number
  q?: number
  volume: number
}
/** the beds that run while the portal is open, which the frame keeps following the portal */
type Beds = {
  hum: GainNode
  humFilter: BiquadFilterNode
  humTones: Array<OscillatorNode>
  shimmer: GainNode
  whoosh: GainNode
  whooshRate: OscillatorNode
}

const silence = 0.0001
/** the tones a bell rings, as multiples of its pitch with their share of its volume and how long they ring */
const bellPartials = [[1, 1, 1], [2.01, 0.45, 0.66], [2.76, 0.32, 0.5], [4.07, 0.18, 0.34], [5.43, 0.1, 0.25]] as const
/** the pitches the ingredients surface with, one after another: a gentle rising motif */
const surfacing = [659.25, 783.99, 987.77, 880]
/** the chord the result flips out on */
const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51]
const impulses = new WeakMap<BaseAudioContext, AudioBuffer>
/** A shimmering space for the portal’s sounds to ring in: two seconds of decaying stereo noise, brighter at first. */
function impulse(context: BaseAudioContext) {
  let buffer = impulses.get(context)
  if (!buffer) {
    const length = Math.ceil(context.sampleRate * 2.2)
    buffer = context.createBuffer(2, length, context.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let smooth = 0
      for (let i = 0; i < length; i++) {
        const t = i / context.sampleRate
        // Smoothed noise darkens the tail, which keeps the high glitter from lingering.
        const white = Math.random() * 2 - 1
        smooth += (white - smooth) * Math.max(0.05, 1 - t * 0.6)
        data[i] = smooth * Math.exp(-t / 0.5) * (t < 0.018 ? 0 : 1)
      }
    }
    impulses.set(context, buffer)
  }
  return buffer
}

/**
 * The sound of a fusion, synthesized live and heard from its portal through an HRTF panner: a low hum, a shimmer and the whoosh of the orbit while the portal brews, a bell for every ingredient that surfaces in it, a rising rush through the climax and a boom with a fanfare when the result flips out – or a sputtering fall when it fizzles.
 * Everything rings in a short, bright reverb. It plays on the sound engine’s effects master, which the mute covers.
 */
export default class FusionSound {
  private beds?: Beds
  private readonly bus: GainNode
  private readonly context: BaseAudioContext
  private readonly panner: PannerNode
  private readonly sources = new Set<AudioScheduledSourceNode>
  private stopped = false

  constructor({context, master}: AudioOutput, [x, y, z]: Vec3) {
    this.context = context
    this.panner = new PannerNode(context, {
      panningModel: 'HRTF',
      distanceModel: 'linear',
      refDistance: 2.5,
      maxDistance: 24,
      rolloffFactor: 1,
      positionX: x,
      positionY: y,
      positionZ: z,
    })
    this.panner.connect(master)
    this.bus = new GainNode(context, {gain: 1})
    this.bus.connect(this.panner)
    const reverb = new ConvolverNode(context, {buffer: impulse(context)})
    this.bus.connect(reverb).connect(new GainNode(context, {gain: 0.35})).connect(this.panner)
  }

  /** The climax: a rush that rises over `duration` seconds while the hum climbs with the vortex. */
  climax(duration: number) {
    if (this.stopped) {
      return
    }
    const now = this.context.currentTime
    this.tone(now, duration + 0.15, {
      frequency: 180,
      end: 1400,
      volume: 0.045,
      attack: duration * 0.85,
      type: 'triangle',
    })
    this.hiss(now, duration + 0.1, {
      filter: 'highpass',
      frequency: 700,
      end: 9000,
      volume: 0.05,
      attack: duration * 0.9,
    })
  }

  /** The result flips out: a deep boom, a blast of air, a fanfare of bells and a spray of glitter, while the hum breaks off. */
  emerge() {
    if (this.stopped) {
      return
    }
    const now = this.context.currentTime
    this.tone(now, 1.1, {
      frequency: 130,
      end: 34,
      volume: 0.13,
      attack: 0.004,
    })
    this.hiss(now, 0.9, {
      filter: 'lowpass',
      frequency: 3200,
      end: 150,
      volume: 0.11,
      attack: 0.004,
    })
    for (const [index, frequency] of fanfare.entries()) {
      this.bell(now + 0.03 + index * 0.035, frequency, 0.024, 2.2)
    }
    for (let index = 0; index < 16; index++) {
      const start = now + 0.05 + Math.random() * 0.9
      this.tone(start, 0.06 + Math.random() * 0.1, {
        frequency: 2500 + Math.random() * 4500,
        volume: 0.01,
        attack: 0.002,
      })
    }
    this.release(0.12, 1.4)
  }

  /** The fusion failed: a sputtering, wobbling fall over `duration` seconds, crackling, with a dull pop as the portal gives out, while the hum sinks away. */
  fizzle(duration: number) {
    if (this.stopped) {
      return
    }
    const now = this.context.currentTime
    this.tone(now, duration * 0.9, {
      frequency: 520,
      end: 70,
      volume: 0.05,
      vibrato: [40, 11],
      type: 'triangle',
    })
    for (let index = 0; index < 12; index++) {
      this.hiss(now + Math.random() * duration * 0.8, 0.03 + Math.random() * 0.05, {
        filter: 'bandpass',
        frequency: 1500 + Math.random() * 2500,
        q: 4,
        volume: 0.05,
        attack: 0.002,
      })
    }
    const pop = now + duration * 0.55
    this.tone(pop, 0.25, {
      frequency: 300,
      end: 70,
      volume: 0.09,
      attack: 0.003,
    })
    this.hiss(pop, 0.2, {
      filter: 'lowpass',
      frequency: 1800,
      end: 200,
      volume: 0.06,
      attack: 0.003,
    })
    if (this.beds) {
      for (const tone of this.beds.humTones) {
        tone.detune.setTargetAtTime(-1200, now, duration / 3)
      }
    }
    this.release(duration * 0.3, duration * 0.4)
  }

  /** The portal opens: a whoosh sweeping up, a soft thump and a rising sparkle, and the beds start. */
  open() {
    if (this.stopped || this.beds) {
      return
    }
    const now = this.context.currentTime
    this.hiss(now, 0.9, {
      filter: 'bandpass',
      frequency: 250,
      end: 3500,
      q: 1.5,
      volume: 0.09,
      attack: 0.45,
    })
    this.tone(now, 0.55, {
      frequency: 95,
      end: 42,
      volume: 0.14,
      attack: 0.01,
    })
    for (const [index, frequency] of [587.33, 880, 1174.66, 1760].entries()) {
      this.bell(now + 0.1 + index * 0.07, frequency, 0.016, 0.9)
    }
    this.beds = this.startBeds(now)
  }

  /** Stops every sound, fading out over `fade` seconds, and releases the nodes. */
  stop(fade = 0.3) {
    if (this.stopped) {
      return
    }
    this.stopped = true
    const now = this.context.currentTime
    this.bus.gain.cancelScheduledValues(now)
    this.bus.gain.setTargetAtTime(0, now, fade / 4)
    for (const source of this.sources) {
      source.stop(now + fade)
    }
    // The reverb rings on for a while after the last source.
    setTimeout(() => this.panner.disconnect(), (fade + 2.4) * 1000)
  }

  /** An ingredient surfaces in the portal: a bell with a slow vibrato over a soft rush, each one a step further along the motif. */
  surface(turn: number) {
    if (this.stopped) {
      return
    }
    const now = this.context.currentTime
    this.bell(now, surfacing[turn % surfacing.length], 0.03, 1.8, [5, 5.5])
    this.hiss(now, 0.7, {
      filter: 'lowpass',
      frequency: 2200,
      end: 400,
      volume: 0.035,
      attack: 0.12,
    })
  }

  /** Follows the portal every frame: the hum swells with its energy and climbs with its vortex, and the orbit’s whoosh passes as often as the satellites do. */
  update({energy, orbit, spin}: {
    energy: number
    /** radians per second the satellites circle the portal at */
    orbit: number
    /** radians per second the vortex turns */
    spin: number
  }) {
    const {beds} = this
    if (!beds || this.stopped) {
      return
    }
    const now = this.context.currentTime
    const level = Math.min(energy, 2)
    beds.hum.gain.setTargetAtTime(level, now, 0.08)
    beds.humFilter.frequency.setTargetAtTime(300 + level * 500, now, 0.08)
    const cents = 1200 * Math.log2(1 + Math.max(0, spin - 1.6) * 0.035)
    for (const tone of beds.humTones) {
      tone.detune.setTargetAtTime(cents, now, 0.1)
    }
    beds.shimmer.gain.setTargetAtTime(level * 0.008, now, 0.1)
    // Two satellites pass the front once each per turn.
    beds.whooshRate.frequency.setTargetAtTime(Math.max(0.05, orbit / Math.PI), now, 0.1)
    beds.whoosh.gain.setTargetAtTime(level * 0.022, now, 0.1)
  }

  /** A bell of the partials, with an optional vibrato. */
  private bell(start: number, frequency: number, volume: number, ring: number, vibrato?: readonly [number, number]) {
    for (const [ratio, share, length] of bellPartials) {
      this.tone(start, ring * length, {
        frequency: frequency * ratio,
        volume: volume * share,
        attack: 0.003,
        vibrato: vibrato ? [vibrato[0] * ratio, vibrato[1]] : undefined,
      })
    }
  }

  private hiss(start: number, duration: number, {attack = 0.01, end, filter, frequency, q = 1, volume}: Hiss) {
    const source = new AudioBufferSourceNode(this.context, {buffer: whiteNoise(this.context)})
    const shaping = new BiquadFilterNode(this.context, {
      type: filter,
      frequency,
      Q: q,
    })
    if (end) {
      shaping.frequency.setValueAtTime(frequency, start)
      shaping.frequency.exponentialRampToValueAtTime(end, start + duration)
    }
    this.play(source.connect(shaping), source, start, duration, volume, attack, Math.random() * 3)
  }

  private play(through: AudioNode, source: AudioScheduledSourceNode, start: number, duration: number, volume: number, attack: number, offset?: number) {
    const envelope = new GainNode(this.context, {gain: 0})
    envelope.gain.setValueAtTime(0, start)
    envelope.gain.linearRampToValueAtTime(volume, start + Math.min(attack, duration * 0.9))
    envelope.gain.exponentialRampToValueAtTime(silence, start + duration)
    through.connect(envelope).connect(this.bus)
    this.sources.add(source)
    source.addEventListener('ended', () => {
      this.sources.delete(source)
      source.disconnect()
      through.disconnect()
      envelope.disconnect()
    }, {once: true})
    if (source instanceof AudioBufferSourceNode) {
      source.start(start, offset)
    } else {
      source.start(start)
    }
    source.stop(start + duration + 0.02)
  }

  /** Lets the beds go: the hum breaks off after `hum` seconds, the shimmer and the whoosh fade over `rest`. */
  private release(hum: number, rest: number) {
    const {beds} = this
    if (!beds) {
      return
    }
    this.beds = undefined
    const now = this.context.currentTime
    beds.hum.gain.cancelScheduledValues(now)
    beds.hum.gain.setTargetAtTime(0, now + hum * 0.5, hum / 3)
    for (const gain of [beds.shimmer.gain, beds.whoosh.gain]) {
      gain.cancelScheduledValues(now)
      gain.setTargetAtTime(0, now, rest / 3)
    }
  }

  /** The beds: a hum of a low fifth and its octaves through a resonant lowpass, a high shimmer trembling seven times a second and a whoosh that swells as the satellites pass. */
  private startBeds(now: number): Beds {
    const {context} = this
    const hum = new GainNode(context, {gain: 0})
    const humFilter = new BiquadFilterNode(context, {
      type: 'lowpass',
      frequency: 300,
      Q: 4,
    })
    humFilter.connect(hum).connect(this.bus)
    const humTones = ([[55, 'sine', 0.02], [110.4, 'triangle', 0.013], [164.8, 'sine', 0.007], [220.6, 'sine', 0.005]] as const).map(([frequency, type, volume]) => {
      const tone = new OscillatorNode(context, {
        frequency,
        type,
      })
      tone.connect(new GainNode(context, {gain: volume})).connect(humFilter)
      return tone
    })
    const shimmer = new GainNode(context, {gain: 0})
    const shimmerNoise = new AudioBufferSourceNode(context, {
      buffer: whiteNoise(context),
      loop: true,
    })
    const tremble = new GainNode(context, {gain: 0.5})
    const trembleRate = new OscillatorNode(context, {frequency: 7})
    trembleRate.connect(new GainNode(context, {gain: 0.5})).connect(tremble.gain)
    shimmerNoise.connect(new BiquadFilterNode(context, {
      type: 'bandpass',
      frequency: 6500,
      Q: 3,
    })).connect(tremble).connect(shimmer).connect(this.bus)
    const whoosh = new GainNode(context, {gain: 0})
    const whooshNoise = new AudioBufferSourceNode(context, {
      buffer: whiteNoise(context),
      loop: true,
    })
    const swell = new GainNode(context, {gain: 0.5})
    const whooshRate = new OscillatorNode(context, {frequency: 0.46})
    whooshRate.connect(new GainNode(context, {gain: 0.5})).connect(swell.gain)
    whooshNoise.connect(new BiquadFilterNode(context, {
      type: 'bandpass',
      frequency: 900,
      Q: 1.1,
    })).connect(swell).connect(whoosh).connect(this.bus)
    for (const source of [...humTones, shimmerNoise, trembleRate, whooshNoise, whooshRate]) {
      this.sources.add(source)
      source.start(now, source instanceof AudioBufferSourceNode ? Math.random() * 5 : undefined)
    }
    return {
      hum,
      humFilter,
      humTones,
      shimmer,
      whoosh,
      whooshRate,
    }
  }

  private tone(start: number, duration: number, {attack = 0.005, end, frequency, type = 'sine', vibrato, volume}: Tone) {
    const oscillator = new OscillatorNode(this.context, {
      frequency,
      type,
    })
    if (end) {
      oscillator.frequency.setValueAtTime(frequency, start)
      oscillator.frequency.exponentialRampToValueAtTime(end, start + duration)
    }
    if (vibrato) {
      const wobble = new OscillatorNode(this.context, {frequency: vibrato[1]})
      wobble.connect(new GainNode(this.context, {gain: vibrato[0]})).connect(oscillator.frequency)
      wobble.start(start)
      wobble.stop(start + duration + 0.02)
      this.sources.add(wobble)
      wobble.addEventListener('ended', () => {
        this.sources.delete(wobble)
        wobble.disconnect()
      }, {once: true})
    }
    this.play(oscillator, oscillator, start, duration, volume, attack)
  }
}
