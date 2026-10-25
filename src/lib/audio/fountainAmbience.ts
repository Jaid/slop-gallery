import type {Vec3} from '../gallery/types.ts'

type Range = readonly [number, number]
/** a looping noise bed through one filter, its level swaying by smooth random modulation */
type Bed = {
  filter: BiquadFilterType
  frequency: number
  q?: number
  /** how fast (per second) and how deep (0–1) the level sways */
  sway: readonly [rate: number, depth: number]
  volume: number
}
/** single bubbles: a sine whose pitch rises as it decays, like an air pocket closing under water */
type Drops = {
  duration: Range
  frequency: Range
  /** average drops per second */
  rate: number
  /** factor the pitch rises by */
  rise: Range
  volume: Range
}
/** short bursts of filtered noise, like water hitting water */
type Splashes = {
  duration: Range
  frequency: Range
  q: number
  rate: number
  volume: Range
}

/** a quiet trickle: a soft hiss under lots of single bubbles */
const trickle = {
  beds: [
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
  ] satisfies Array<Bed>,
  drops: {
    rate: 18,
    frequency: [500, 2200],
    rise: [1.4, 2.6],
    duration: [0.02, 0.06],
    volume: [0.03, 0.08],
  } satisfies Drops,
  splashes: {
    rate: 1.5,
    frequency: [2500, 5000],
    q: 2,
    duration: [0.03, 0.06],
    volume: [0.015, 0.03],
  } satisfies Splashes,
}
const between = ([min, max]: Range) => min + Math.random() * (max - min)
/** seconds the beds loop over; white noise has no audible seam */
const loopLength = 6
const lookahead = 0.25
/** Full level within `near` meters of the spray, fading linearly to silence at `far`. */
const hearing = {
  near: 1,
  far: 10,
}
const ambienceGain = 0.6
/** how much quieter and darker the fountain is heard from other rooms */
const elsewhere = {
  gain: 0.3,
  frequency: 650,
}
function whiteNoise(context: BaseAudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * loopLength, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}
/** Smooth random values in 0–1 that loop seamlessly, `rate` new targets per second. */
function swayCurve(context: BaseAudioContext, rate: number) {
  const points = Math.max(2, Math.round(rate * loopLength))
  const targets = Array.from({length: points}, Math.random)
  const buffer = context.createBuffer(1, context.sampleRate * loopLength, context.sampleRate)
  const data = buffer.getChannelData(0)
  const step = data.length / points
  for (let i = 0; i < data.length; i++) {
    const position = i / step
    const index = Math.floor(position)
    const blend = (1 - Math.cos((position - index) * Math.PI)) / 2
    data[i] = targets[index % points] * (1 - blend) + targets[(index + 1) % points] * blend
  }
  return buffer
}

/**
 * The fountain’s endless water, synthesized like the player’s effects: looping filtered noise beds with swaying levels, plus randomly timed bubbles and splashes.
 * It sounds from the fountain’s position through an HRTF panner, muffled while the listener is in another room.
 */
export default class FountainAmbience {
  private readonly bus: GainNode
  private inside = true
  private nextDrop: number
  private nextSplash: number
  private readonly noise: AudioBuffer
  private readonly panner: PannerNode
  private readonly room: BiquadFilterNode
  private readonly roomGain: GainNode
  private readonly sources: Array<AudioScheduledSourceNode> = []
  private readonly timer: ReturnType<typeof setInterval>

  constructor(private readonly context: BaseAudioContext, output: AudioNode, position: Vec3) {
    this.noise = whiteNoise(context)
    this.panner = new PannerNode(context, {
      panningModel: 'HRTF',
      distanceModel: 'linear',
      refDistance: hearing.near,
      maxDistance: hearing.far,
      rolloffFactor: 1,
      positionX: position[0],
      positionY: position[1],
      positionZ: position[2],
    })
    this.room = new BiquadFilterNode(context, {
      type: 'lowpass',
      frequency: 20_000,
    })
    this.roomGain = new GainNode(context, {gain: ambienceGain})
    this.bus = new GainNode(context, {gain: 0})
    this.bus.gain.setTargetAtTime(1, context.currentTime, 0.2)
    this.bus.connect(this.room).connect(this.roomGain).connect(this.panner).connect(output)
    for (const bed of trickle.beds) {
      this.startBed(bed)
    }
    this.nextDrop = context.currentTime
    this.nextSplash = context.currentTime
    this.timer = setInterval(() => this.schedule(), 80)
  }

  dispose(fade = 0.1) {
    clearInterval(this.timer)
    const now = this.context.currentTime
    this.bus.gain.cancelScheduledValues(now)
    this.bus.gain.setTargetAtTime(0, now, fade / 4)
    for (const source of this.sources) {
      source.stop(now + fade)
    }
    setTimeout(() => this.panner.disconnect(), (fade + lookahead) * 1000 + 100)
  }

  /** Muffles the fountain while the listener is outside its room. */
  setInside(inside: boolean) {
    if (inside === this.inside) {
      return
    }
    this.inside = inside
    const now = this.context.currentTime
    this.room.frequency.setTargetAtTime(inside ? 20_000 : elsewhere.frequency, now, 0.3)
    this.roomGain.gain.setTargetAtTime(ambienceGain * (inside ? 1 : elsewhere.gain), now, 0.3)
  }

  private drop(start: number) {
    const {drops} = trickle
    const duration = between(drops.duration)
    const frequency = between(drops.frequency)
    const oscillator = this.context.createOscillator()
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * between(drops.rise), start + duration)
    this.envelope(oscillator, start, duration, between(drops.volume))
  }

  private envelope(source: AudioScheduledSourceNode, start: number, duration: number, volume: number, through: AudioNode = source, offset?: number) {
    const envelope = this.context.createGain()
    envelope.gain.value = 0
    envelope.gain.setValueAtTime(0, start)
    envelope.gain.linearRampToValueAtTime(volume, start + 0.004)
    envelope.gain.exponentialRampToValueAtTime(0.00001, start + duration)
    through.connect(envelope).connect(this.bus)
    source.addEventListener('ended', () => {
      source.disconnect()
      through.disconnect()
      envelope.disconnect()
    }, {once: true})
    if (source instanceof AudioBufferSourceNode) {
      source.start(start, offset)
    } else {
      source.start(start)
    }
    source.stop(start + duration + 0.01)
  }

  /** Schedules the drops and splashes falling within the lookahead. */
  private schedule() {
    const now = this.context.currentTime
    const until = now + lookahead
    for (; this.nextDrop < until; this.nextDrop += -Math.log(1 - Math.random()) / trickle.drops.rate) {
      this.drop(Math.max(this.nextDrop, now))
    }
    for (; this.nextSplash < until; this.nextSplash += -Math.log(1 - Math.random()) / trickle.splashes.rate) {
      this.splash(Math.max(this.nextSplash, now))
    }
  }

  private splash(start: number) {
    const {splashes} = trickle
    const duration = between(splashes.duration)
    const source = this.context.createBufferSource()
    source.buffer = this.noise
    const filter = this.context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = between(splashes.frequency)
    filter.Q.value = splashes.q
    source.connect(filter)
    this.envelope(source, start, duration, between(splashes.volume), filter, Math.random() * (loopLength - duration))
  }

  private startBed(bed: Bed) {
    const {context} = this
    const source = context.createBufferSource()
    source.buffer = this.noise
    source.loop = true
    const filter = new BiquadFilterNode(context, {
      type: bed.filter,
      frequency: bed.frequency,
      Q: bed.q ?? 0.7,
    })
    const [rate, depth] = bed.sway
    const level = new GainNode(context, {gain: bed.volume * (1 - depth)})
    const sway = context.createBufferSource()
    sway.buffer = swayCurve(context, rate)
    sway.loop = true
    sway.connect(new GainNode(context, {gain: bed.volume * depth})).connect(level.gain)
    sway.start()
    source.connect(filter).connect(level).connect(this.bus)
    // Every bed starts somewhere else in the shared noise, so they never move in lockstep.
    source.start(0, Math.random() * loopLength)
    this.sources.push(source, sway)
  }
}
