import type {AudioClock, AudioPlayback} from '../src/types.ts'

export const flush = async () => {
  for (let i = 0; i < 24; i++) {
    await Promise.resolve()
  }
}

export class FakeClock implements AudioClock {
  now = () => this.time
  schedule = (callback: () => void, seconds: number) => {
    const job = {
      at: this.time + seconds,
      callback,
    }
    this.jobs.add(job)
    return () => {
      this.jobs.delete(job)
    }
  }
  time = 0
  private jobs = new Set<{
    at: number
    callback: () => void
  }>
  get size() {
    return this.jobs.size
  }
  async advance(seconds: number) {
    const until = this.time + seconds
    await flush()
    for (;;) {
      const next = [...this.jobs].filter(job => job.at <= until + 1e-9).sort((a, b) => a.at - b.at)[0]
      if (!next) {
        break
      }
      this.time = next.at
      this.jobs.delete(next)
      next.callback()
      await flush()
    }
    this.time = until
    await flush()
  }
}

export class FakePlayback implements AudioPlayback {
  completion = Promise.withResolvers<void>()
  disposals = 0
  dispose = () => {
    this.playing = false; this.disposals++; this.log.push(`dispose:${this.name}`)
  }
  finished = this.completion.promise
  pause = () => {
    this.playing = false; this.pauses++; this.log.push(`pause:${this.name}`)
  }
  pauses = 0
  play = () => {
    this.playing = true; this.plays++; this.log.push(`play:${this.name}:${this.position}`)
  }
  playing = false
  plays = 0
  position = 0
  constructor(readonly name = '', readonly log: Array<string> = []) {}
  end() {
    this.playing = false; this.completion.resolve()
  }
}
