import type {AudioPlayback, AudioTask} from './types.ts'

export type AudioReference = Blob | URL | string
export type AudioFileOptions = {
  /** Owns only this connection. The returned cleanup must not close a shared AudioContext. */
  connect?: (audio: HTMLAudioElement) => () => void
  /** For example, resume an app-owned AudioContext before creating a media source. */
  prepare?: (signal: AbortSignal) => Promise<void> | void
  volume?: number
}

/** Lazy, independently pausable HTML audio. Caller-owned URLs are never revoked. */
export function audioFile<T extends object = Record<string, never>>(reference: AudioReference, options: AudioFileOptions = {}): AudioTask<T> {
  return async ({signal}) => {
    signal.throwIfAborted()
    await options.prepare?.(signal)
    signal.throwIfAborted()
    const volume = options.volume ?? 1
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      throw new RangeError('Audio volume must be between zero and one.')
    }
    const {owned, source} = sourceFor(reference)
    let audio: HTMLAudioElement | undefined
    let disconnect: (() => void) | undefined
    const state = {
      disposed: false,
      version: 0,
      wanted: false,
    }
    const completion = Promise.withResolvers<void>()
    // A load error can precede the queue attaching its observer.
    void completion.promise.catch(() => {})
    const ended = () => completion.resolve()
    const failed = () => completion.reject(new Error('Audio playback failed.'))
    const dispose = () => {
      if (state.disposed) {
        return
      }
      state.disposed = true
      state.wanted = false
      state.version++
      signal.removeEventListener('abort', dispose)
      audio?.removeEventListener('ended', ended)
      audio?.removeEventListener('error', failed)
      audio?.pause()
      try {
        disconnect?.()
      } finally {
        audio?.removeAttribute('src')
        audio?.load()
        if (owned) {
          URL.revokeObjectURL(owned)
        }
        completion.resolve()
      }
    }
    try {
      audio = new Audio(source)
      audio.preload = 'auto'
      audio.volume = volume
      audio.addEventListener('ended', ended)
      audio.addEventListener('error', failed)
      disconnect = options.connect?.(audio)
      signal.addEventListener('abort', dispose, {once: true})
      signal.throwIfAborted()
      const playback: AudioPlayback = {
        finished: completion.promise,
        play: async () => {
          signal.throwIfAborted()
          if (state.disposed) {
            throw new Error('Audio playback was disposed.')
          }
          state.wanted = true
          const startVersion = ++state.version
          await audio!.play()
          // A stale start may resolve after pause/disposal. Do not let it resurrect output.
          if (startVersion !== state.version && !state.wanted) {
            audio!.pause()
          }
        },
        pause: () => {
          state.wanted = false
          state.version++
          audio!.pause()
        },
        dispose,
      }
      return playback
    } catch (error) {
      dispose()
      throw error
    }
  }
}

function sourceFor(reference: AudioReference) {
  if (reference instanceof Blob) {
    const source = URL.createObjectURL(reference)
    return {
      owned: source,
      source,
    }
  }
  return {
    owned: undefined,
    source: reference instanceof URL ? reference.href : reference,
  }
}
