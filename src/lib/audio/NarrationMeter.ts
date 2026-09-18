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

/** Analyses narration only. Suspended voices remain connected; concurrent voices are included. */
export default class NarrationMeter {
  private readonly bands = new Float32Array(narrationBands.length)
  private connections = new Set<{
    analyser: AnalyserNode
    audio: HTMLAudioElement
  }>
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
    analyser.connect(context.destination)
    const connection = {
      audio,
      analyser,
    }
    this.connections.add(connection)
    return () => {
      if (!this.connections.delete(connection)) {
        return
      }
      source.disconnect()
      analyser.disconnect()
    }
  }

  read() {
    this.levels.fill(0)
    for (const {audio, analyser} of this.connections) {
      if (audio.paused || audio.ended || audio.muted || audio.volume === 0 || analyser.context.state !== 'running') {
        continue
      }
      analyser.getByteFrequencyData(this.frequencies)
      frequencyLevels(this.frequencies, analyser.context.sampleRate, analyser.fftSize, this.bands)
      // Show the strongest measured voice in each band, without fabricating levels for silent padding.
      for (let band = 0; band < this.levels.length; band++) {
        this.levels[band] = Math.max(this.levels[band], this.bands[band])
      }
    }
    return this.levels
  }
}

export const narrationMeter = new NarrationMeter
