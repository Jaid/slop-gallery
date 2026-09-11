// Boost procedural effects by 12 dB without changing narration or individual envelopes.
const effectsGain = 0.6 * 10 ** (12 / 20)

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

  private constructor() {
    this.master.gain.value = effectsGain
    this.master.connect(this.context.destination)
  }

  mute(muted: boolean) {
    this.master.gain.setTargetAtTime(muted ? 0 : effectsGain, this.context.currentTime, 0.08)
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
