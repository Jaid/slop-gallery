export class SoundEngine {
  private static instance: SoundEngine | undefined
  static existing() {
    return this.instance
  }
  static get() {
    return this.instance ??= new SoundEngine
  }
  readonly context = new AudioContext
  readonly master = this.context.createGain()

  private lastStep = 0

  private water: {gain: GainNode
    pan: StereoPannerNode
    source: AudioBufferSourceNode} | undefined

  private constructor() {
    this.master.gain.value = 0.6
    this.master.connect(this.context.destination)
  }

  fountain(distance: number, pan: number) {
    if (!this.water) {
      const buffer = this.context.createBuffer(1, this.context.sampleRate * 4, this.context.sampleRate)
      const data = buffer.getChannelData(0)
      let brown = 0
      for (let i = 0; i < data.length; i++) {
        brown = (brown + (Math.random() * 2 - 1) * 0.04) / 1.04
        data[i] = brown * 3
      }
      const source = this.context.createBufferSource()
      const filter = this.context.createBiquadFilter()
      const gain = this.context.createGain()
      const pan = this.context.createStereoPanner()
      source.buffer = buffer
      source.loop = true
      filter.type = 'bandpass'
      filter.frequency.value = 800
      filter.Q.value = 0.3
      source.connect(filter).connect(gain).connect(pan).connect(this.master)
      gain.gain.value = 0
      source.start()
      this.water = {
        source,
        gain,
        pan,
      }
    }
    this.water.gain.gain.setTargetAtTime(Math.min(0.13, 0.25 / (1 + distance * distance * 0.12)), this.context.currentTime, 0.15)
    this.water.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), this.context.currentTime, 0.15)
  }

  mute(muted: boolean) {
    this.master.gain.setTargetAtTime(muted ? 0 : 0.6, this.context.currentTime, 0.08)
  }

  async resume() {
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
  }

  step(wood: boolean) {
    const now = this.context.currentTime
    if (now - this.lastStep < 0.28) {
      return
    }
    this.lastStep = now
    this.tone(wood ? 125 : 230, 0.07, 0.018)
  }

  tone(frequency: number, duration = 0.3, volume = 0.055) {
    const time = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, time)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.55, time + duration)
    gain.gain.setValueAtTime(volume, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    oscillator.connect(gain).connect(this.master)
    oscillator.start(time)
    oscillator.stop(time + duration)
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect()
      gain.disconnect()
    })
  }
}
