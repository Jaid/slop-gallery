export const narrationBands = [[20, 120], [120, 500], [500, 2000], [2000, 6000], [6000, 12_000]] as const

/** RMS of the analyser’s normalized frequency magnitudes, grouped like the reference visualizer. */
export function frequencyLevels(frequencies: Uint8Array, sampleRate: number, fftSize: number, output = new Float32Array(narrationBands.length)) {
  const binHz = sampleRate / fftSize
  for (const [band, [minimum, maximum]] of narrationBands.entries()) {
    const first = Math.max(0, Math.ceil(minimum / binHz))
    const last = Math.min(frequencies.length, Math.ceil(maximum / binHz))
    let squares = 0
    for (let i = first; i < last; i++) {
      squares += (frequencies[i] / 255) ** 2
    }
    output[band] = last > first ? Math.sqrt(squares / (last - first)) : 0
  }
  return output
}

/** Analyses narration only, never footsteps or other gallery sound effects. */
export class NarrationMeter {
  private analyser: AnalyserNode | undefined
  private audio: HTMLAudioElement | undefined
  private frequencies = new Uint8Array(1024)
  private readonly levels = new Float32Array(narrationBands.length)

  connect(audio: HTMLAudioElement, context: AudioContext) {
    const source = context.createMediaElementSource(audio)
    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.72
    analyser.minDecibels = -90
    analyser.maxDecibels = -10
    source.connect(analyser)
    // Preserve the existing narration volume; the effects mixer has a separate gain.
    analyser.connect(context.destination)
    this.analyser = analyser
    this.audio = audio
    this.levels.fill(0)
    return () => {
      source.disconnect()
      analyser.disconnect()
      // A stale playback callback must not clear a newer story’s meter.
      if (this.analyser === analyser) {
        this.analyser = undefined
        this.audio = undefined
        this.levels.fill(0)
      }
    }
  }

  read() {
    const {analyser, audio} = this
    if (!analyser || !audio || audio.paused || audio.ended || audio.muted || audio.volume === 0 || analyser.context.state !== 'running') {
      return this.levels.fill(0)
    }
    analyser.getByteFrequencyData(this.frequencies)
    return frequencyLevels(this.frequencies, analyser.context.sampleRate, analyser.fftSize, this.levels)
  }
}

export const narrationMeter = new NarrationMeter
