export type SoundEffect = {
  id: string
  label: string
  voices: Array<Voice>
}
export type Voice = NoiseVoice | OscillatorVoice
type FilterSpec = {
  endFrequency?: number
  frequency: number
  q?: number
  type: BiquadFilterType
}
type OscillatorVoice = {
  attack?: number
  delay?: number
  duration: number
  endFrequency?: number
  filter?: FilterSpec
  frequency: number
  kind: 'oscillator'
  type?: OscillatorType
  volume: number
}
type NoiseVoice = {
  attack?: number
  delay?: number
  duration: number
  filter: FilterSpec
  kind: 'noise'
  volume: number
}

export const osc = (frequency: number, duration: number, volume: number, options: Partial<Omit<OscillatorVoice, 'duration' | 'frequency' | 'kind' | 'volume'>> = {}): OscillatorVoice => ({
  kind: 'oscillator',
  type: 'sine',
  frequency,
  duration,
  volume,
  ...options,
})
export const noise = (duration: number, volume: number, filter: FilterSpec, options: Partial<Omit<NoiseVoice, 'duration' | 'filter' | 'kind' | 'volume'>> = {}): NoiseVoice => ({
  kind: 'noise',
  duration,
  volume,
  filter,
  ...options,
})

export type AudioOutput = {
  context: BaseAudioContext
  master: AudioNode
}
export type ProceduralPlayback = {
  gain: AudioParam
  stop: (fade?: number) => void
}

const fillNoise = (data: Float32Array, seed: string) => {
  let state = 2_166_136_261
  for (const character of seed) {
    state = Math.imul(state ^ character.codePointAt(0)!, 16_777_619) >>> 0
  }
  for (let i = 0; i < data.length; i++) {
    state = Math.imul(state, 1_664_525) + 1_013_904_223 >>> 0
    data[i] = state / 2_147_483_648 - 1
  }
}
const silence = 0.00001
/** The same graph runs live or offline. A playback owns all of its nodes, never the output. */
export function playVoices({context, master}: AudioOutput, voices: ReadonlyArray<Voice>, seed: string, options: {
  /** Fit the entire recipe, including delays, to this duration. */
  duration?: number
  gain?: number
  /** Hold the envelopes until stop(); used for the quiet zoom layer. */
  sustain?: boolean
} = {}): ProceduralPlayback {
  const bus = context.createGain()
  bus.gain.value = options.gain ?? 1
  bus.connect(master)
  const length = Math.max(...voices.map(voice => (voice.delay ?? 0) + voice.duration))
  const scale = options.duration === undefined ? 1 : Math.max(0.01, options.duration) / length
  const sources = new Set<AudioScheduledSourceNode>
  const now = context.currentTime
  for (const [index, voice] of voices.entries()) {
    const start = now + (voice.delay ?? 0) * scale
    const duration = voice.duration * scale
    const end = start + duration
    const attack = Math.min((voice.attack ?? 0.003) * scale, duration * 0.8)
    const envelope = context.createGain()
    // Source start and automation can round to adjacent samples; silence must precede onset.
    envelope.gain.value = 0
    envelope.gain.setValueAtTime(0, start)
    envelope.gain.linearRampToValueAtTime(voice.volume, start + attack)
    if (!options.sustain) {
      envelope.gain.exponentialRampToValueAtTime(silence, end)
      envelope.gain.setValueAtTime(0, end)
    }
    const filter = voice.filter ? context.createBiquadFilter() : undefined
    if (filter && voice.filter) {
      filter.type = voice.filter.type
      filter.Q.value = voice.filter.q ?? 1
      filter.frequency.setValueAtTime(voice.filter.frequency, start)
      if (voice.filter.endFrequency) {
        filter.frequency.exponentialRampToValueAtTime(voice.filter.endFrequency, end)
      }
      filter.connect(envelope)
    }
    envelope.connect(bus)
    let source: AudioScheduledSourceNode
    if (voice.kind === 'oscillator') {
      const oscillator = context.createOscillator()
      oscillator.type = voice.type ?? 'sine'
      oscillator.frequency.setValueAtTime(voice.frequency, start)
      if (voice.endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(voice.endFrequency, end)
      }
      source = oscillator
    } else {
      const buffer = context.createBuffer(1, Math.max(1, Math.ceil(context.sampleRate * duration)), context.sampleRate)
      fillNoise(buffer.getChannelData(0), `${seed}:${index}`)
      const noiseSource = context.createBufferSource()
      noiseSource.buffer = buffer
      noiseSource.loop = !!options.sustain
      source = noiseSource
    }
    source.connect(filter ?? envelope)
    sources.add(source)
    source.addEventListener('ended', () => {
      source.disconnect()
      filter?.disconnect()
      envelope.disconnect()
      sources.delete(source)
      if (!sources.size) {
        bus.disconnect()
      }
    }, {once: true})
    source.start(start)
    if (!options.sustain) {
      source.stop(end)
    }
  }
  let stopped = false
  return {
    gain: bus.gain,
    stop(fade = 0.025) {
      if (stopped || !sources.size) {
        return
      }
      stopped = true
      const stopTime = context.currentTime
      bus.gain.cancelAndHoldAtTime(stopTime)
      bus.gain.linearRampToValueAtTime(0, stopTime + fade)
      for (const source of sources) {
        source.stop(stopTime + fade)
      }
    },
  }
}
