import type {RoomId, Vec3} from '../../../gallery/types.ts'
import type {AudioOutput} from '../../proceduralAudio.ts'
import type {Range} from './noise.ts'

import {clamp} from 'math'

import {loopLength, swayCurve, whiteNoise} from './noise.ts'

/** a looping noise bed through one filter, its level swaying by smooth random modulation */
export type NoiseBed = {
  filter: BiquadFilterType
  frequency: number
  q?: number
  /** how many identical filters the noise passes in a row, each one steepening the slope by 12 dB per octave */
  stages?: number
  /** how fast (per second) and how deep (0–1) the level sways */
  sway?: readonly [rate: number, depth: number]
  volume: number
}
export type AmbienceEmitterOptions = {
  /** overall level */
  gain?: number
  /** full level within `near` meters, fading linearly to silence at `far` */
  hearing: {
    far: number
    near: number
  }
  id: string
  position: Vec3
  /** the rooms the emitter sounds in; it is disabled while the listener is anywhere else */
  rooms?: ReadonlyArray<RoomId>
  title: string
}
type Graph = {
  bus: GainNode
  context: BaseAudioContext
  level: GainNode
  panner: PannerNode
  scheduledUntil: number
  sources: Set<AudioScheduledSourceNode>
  timer: ReturnType<typeof setInterval>
}

/** how far ahead one-shots are scheduled, in seconds */
const lookahead = 0.25
const scheduleInterval = 80
const silence = 0.00001

/**
 * A positional, endlessly looping ambient sound, synthesized live with Web Audio: subclasses declare looping {@link NoiseBed}s and scatter one-shots like {@link chirp} and {@link burst} over each scheduling window.
 * Constructing one makes no sound; {@link start} builds its graph on an output, heard through an HRTF panner at {@link position}, and fades out while the listener is outside its {@link rooms}.
 */
export default abstract class AmbienceEmitter {
  readonly gain: number
  readonly hearing: AmbienceEmitterOptions['hearing']
  readonly id: string
  readonly position: Vec3
  readonly rooms?: ReadonlyArray<RoomId>
  readonly title: string
  private graph?: Graph
  private inside = true

  constructor({id, title, position, hearing, gain = 1, rooms}: AmbienceEmitterOptions) {
    this.id = id
    this.title = title
    this.position = position
    this.hearing = hearing
    this.gain = gain
    this.rooms = rooms
  }

  /** the looping beds, read whenever the emitter starts */
  protected get beds(): ReadonlyArray<NoiseBed> {
    return []
  }

  get playing() {
    return Boolean(this.graph)
  }

  /** A short burst of band-passed noise. */
  protected burst(start: number, duration: number, volume: number, frequency: number, q = 1) {
    const graph = this.graph!
    const source = graph.context.createBufferSource()
    source.buffer = whiteNoise(graph.context)
    const filter = new BiquadFilterNode(graph.context, {
      type: 'bandpass',
      frequency,
      Q: q,
    })
    source.connect(filter)
    this.envelope(graph, source, start, duration, volume, filter, Math.random() * (loopLength - duration))
  }

  /** A sine sweeping from `frequency` to `endFrequency` as it decays. */
  protected chirp(start: number, duration: number, volume: number, frequency: number, endFrequency = frequency) {
    const graph = this.graph!
    const oscillator = graph.context.createOscillator()
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration)
    this.envelope(graph, oscillator, start, duration, volume)
  }

  /** Whether `room` is one the emitter stands in. */
  isInside(room: RoomId) {
    return !this.rooms || this.rooms.includes(room)
  }

  /** Random event times averaging `rate` per second within `from`–`until`. A Poisson process has no memory, so consecutive windows need no shared state. */
  protected *scatter(rate: number, from: number, until: number) {
    for (let time = from - Math.log(1 - Math.random()) / rate; time < until; time -= Math.log(1 - Math.random()) / rate) {
      yield time
    }
  }

  /** Schedules the one-shots that fall within `from`–`until`; the default emitter has only beds. */
  protected schedule(_from: number, _until: number) {}

  /** Disables the emitter while the listener is outside its rooms. */
  setListenerRoom(room: RoomId) {
    const inside = this.isInside(room)
    if (inside === this.inside) {
      return
    }
    this.inside = inside
    this.graph?.level.gain.setTargetAtTime(inside ? this.gain : 0, this.graph.context.currentTime, 0.3)
  }

  /** Starts sounding on `output`; does nothing while already playing. */
  start({context, master}: AudioOutput) {
    if (this.graph) {
      return
    }
    const [x, y, z] = this.position
    const panner = new PannerNode(context, {
      panningModel: 'HRTF',
      distanceModel: 'linear',
      refDistance: this.hearing.near,
      maxDistance: this.hearing.far,
      rolloffFactor: 1,
      positionX: x,
      positionY: y,
      positionZ: z,
    })
    const level = new GainNode(context, {gain: this.inside ? this.gain : 0})
    const bus = new GainNode(context, {gain: 0})
    bus.gain.setTargetAtTime(1, context.currentTime, 0.2)
    bus.connect(level).connect(panner).connect(master)
    const graph: Graph = {
      bus,
      context,
      level,
      panner,
      scheduledUntil: context.currentTime,
      sources: new Set,
      timer: setInterval(() => this.tick(graph), scheduleInterval),
    }
    this.graph = graph
    for (const bed of this.beds) {
      this.loopBed(graph, bed)
    }
    this.tick(graph)
  }

  /** Fades out and releases every node. */
  stop(fade = 0.1) {
    const {graph} = this
    if (!graph) {
      return
    }
    this.graph = undefined
    clearInterval(graph.timer)
    const now = graph.context.currentTime
    graph.bus.gain.cancelScheduledValues(now)
    graph.bus.gain.setTargetAtTime(0, now, fade / 4)
    for (const source of graph.sources) {
      source.stop(now + fade)
    }
    setTimeout(() => graph.panner.disconnect(), (fade + lookahead) * 1000 + 100)
  }

  /** How loud the emitter reaches a listener at `listener` in `room`, 0–1, before {@link gain}; 0 while disabled there. */
  strengthAt(listener: Vec3, room: RoomId) {
    if (!this.isInside(room)) {
      return 0
    }
    const distance = Math.hypot(listener[0] - this.position[0], listener[1] - this.position[1], listener[2] - this.position[2])
    const {near, far} = this.hearing
    const falloff = 1 - clamp((distance - near) / (far - near), 0, 1)
    return falloff
  }

  /** a random value within `range` */
  protected vary(range: Range) {
    return range[0] + Math.random() * (range[1] - range[0])
  }

  private envelope(graph: Graph, source: AudioScheduledSourceNode, start: number, duration: number, volume: number, through: AudioNode = source, offset?: number) {
    const envelope = graph.context.createGain()
    envelope.gain.value = 0
    envelope.gain.setValueAtTime(0, start)
    envelope.gain.linearRampToValueAtTime(volume, start + 0.004)
    envelope.gain.exponentialRampToValueAtTime(silence, start + duration)
    through.connect(envelope).connect(graph.bus)
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

  private loopBed(graph: Graph, bed: NoiseBed) {
    const {context} = graph
    const source = context.createBufferSource()
    source.buffer = whiteNoise(context)
    source.loop = true
    const filters = Array.from({length: bed.stages ?? 1}, () => new BiquadFilterNode(context, {
      type: bed.filter,
      frequency: bed.frequency,
      Q: bed.q ?? 0.7,
    }))
    const [rate, depth] = bed.sway ?? [0, 0]
    const level = new GainNode(context, {gain: bed.volume * (1 - depth)})
    if (depth) {
      const sway = context.createBufferSource()
      sway.buffer = swayCurve(context, rate)
      sway.loop = true
      sway.connect(new GainNode(context, {gain: bed.volume * depth})).connect(level.gain)
      sway.start()
      graph.sources.add(sway)
    }
    let tail: AudioNode = source
    for (const filter of filters) {
      tail = tail.connect(filter)
    }
    tail.connect(level).connect(graph.bus)
    // Every bed starts somewhere else in the shared noise, so beds never move in lockstep.
    source.start(0, Math.random() * loopLength)
    graph.sources.add(source)
  }

  private tick(graph: Graph) {
    const now = graph.context.currentTime
    const until = now + lookahead
    if (until > graph.scheduledUntil) {
      this.schedule(Math.max(graph.scheduledUntil, now), until)
      graph.scheduledUntil = until
    }
  }
}
