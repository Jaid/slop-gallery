import type {AudioPlayback} from 'use-audio-queue/core'

/** Switches backend inside the same queue slot, including failures after playback has begun. */
export default function fallbackPlayback(primary: AudioPlayback, fallback: (error: unknown) => AudioPlayback | Promise<AudioPlayback>, signal: AbortSignal): AudioPlayback {
  const completion = Promise.withResolvers<void>()
  void completion.promise.catch(() => {})
  let current = primary
  let switched = false
  let switching: Promise<void> | undefined
  let wanted = false
  let disposed = false
  const observe = (playback: AudioPlayback) => {
    void playback.finished.then(() => {
      if (!disposed && current === playback && !switching) {
        completion.resolve()
      }
    }, error => {
      if (!disposed && current === playback) {
        void recover(playback, error).catch(() => {})
      }
    })
  }
  const recover = (failed: AudioPlayback, error: unknown): Promise<void> => {
    if (disposed || signal.aborted) {
      return Promise.resolve()
    }
    if (switching) {
      return switching
    }
    if (current !== failed) {
      return Promise.resolve()
    }
    if (switched) {
      completion.reject(error)
      return Promise.reject(error)
    }
    switched = true
    // Defer the switch so duplicate error/play-rejection callbacks see one shared operation.
    switching = Promise.resolve().then(async () => {
      failed.dispose()
      signal.throwIfAborted()
      const next = await fallback(error)
      if (disposed || signal.aborted) {
        void next.finished.catch(() => {})
        next.dispose()
        return
      }
      current = next
      switching = undefined
      observe(next)
      if (wanted) {
        await next.play()
      }
    }).catch(error_ => {
      switching = undefined
      if (!disposed) {
        completion.reject(error_)
      }
      throw error_
    })
    return switching
  }
  observe(primary)
  return {
    finished: completion.promise,
    play: async () => {
      signal.throwIfAborted()
      wanted = true
      if (switching) {
        return switching
      }
      const playback = current
      try {
        await playback.play()
      } catch (error) {
        await recover(playback, error)
      }
    },
    pause: () => {
      wanted = false
      current.pause()
    },
    dispose: () => {
      if (disposed) {
        return
      }
      disposed = true
      wanted = false
      current.dispose()
      completion.resolve()
    },
  }
}
