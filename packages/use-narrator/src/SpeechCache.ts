import type {AudioReference, SpeechReference, SpeechSynthesizer} from './types.ts'

type Job = {
  controller: AbortController
  promise: Promise<AudioReference>
  users: number
}

/** Bounded completed-audio cache, with independently cancellable consumers of shared generation. */
export default class SpeechCache implements Disposable {
  synthesize = async (speech: SpeechReference, signal: AbortSignal): Promise<AudioReference> => {
    signal.throwIfAborted()
    if (this.disposed) {
      throw new Error('Speech cache was disposed.')
    }
    const key = JSON.stringify([speech.text, speech.lang, speech.rate, speech.pitch, speech.voice])
    const cached = this.cache.get(key)
    if (cached !== undefined) {
      this.cache.delete(key)
      this.cache.set(key, cached)
      return cached
    }
    let job = this.jobs.get(key)
    if (!job || job.controller.signal.aborted) {
      const controller = new AbortController
      const created: Job = {
        controller,
        users: 0,
        promise: Promise.resolve(''),
      }
      created.promise = Promise.resolve().then(() => {
        controller.signal.throwIfAborted()
        return this.provider(speech, controller.signal)
      }).then(audio => {
        if (!controller.signal.aborted && !this.disposed) {
          this.cache.set(key, audio)
          while (this.cache.size > this.capacity) {
            this.cache.delete(this.cache.keys().next().value!)
          }
        }
        return audio
      }).finally(() => {
        if (this.jobs.get(key) === created) {
          this.jobs.delete(key)
        }
      })
      void created.promise.catch(() => {})
      this.jobs.set(key, created)
      job = created
    }
    const shared = job
    shared.users++
    return new Promise<AudioReference>((resolve, reject) => {
      let settled = false
      const release = () => {
        if (settled) {
          return false
        }
        settled = true
        signal.removeEventListener('abort', abort)
        shared.controller.signal.removeEventListener('abort', sharedAbort)
        shared.users--
        if (!shared.users && this.jobs.get(key) === shared) {
          shared.controller.abort()
        }
        return true
      }
      const abort = () => {
        if (release()) {
          reject(signal.reason)
        }
      }
      const sharedAbort = () => {
        if (release()) {
          reject(shared.controller.signal.reason)
        }
      }
      signal.addEventListener('abort', abort, {once: true})
      shared.controller.signal.addEventListener('abort', sharedAbort, {once: true})
      if (signal.aborted) {
        abort()
      }
      void shared.promise.then(audio => {
        if (release()) {
          resolve(audio)
        }
      }, error => {
        if (release()) {
          reject(error)
        }
      })
    })
  }
  private cache = new Map<string, AudioReference>
  private disposed = false

  private jobs = new Map<string, Job>

  constructor(private readonly provider: SpeechSynthesizer, readonly capacity = 24) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new RangeError('Speech cache capacity must be a positive integer.')
    }
  }

  dispose() {
    if (this.disposed) {
      return
    }
    this.disposed = true
    for (const job of this.jobs.values()) {
      job.controller.abort()
    }
    this.jobs.clear()
    this.cache.clear()
  }
  [Symbol.dispose]() {
    this.dispose()
  }
}
