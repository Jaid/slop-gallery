import type {NarrationInput, NarrationMetadata, NarrationPushOptions, NarrationReference, NarratorOptions, RecordingReference, SpeechReference} from './types.ts'
import type {AudioHandle, AudioPlayback, AudioQueueSnapshot} from 'use-audio-queue/core'

import {audioFile} from 'use-audio-queue/browser'
import {AudioQueue} from 'use-audio-queue/core'

import {browserSpeech} from './browser.ts'
import fallbackPlayback from './fallbackPlayback.ts'

function normalize(reference: NarrationReference): RecordingReference | SpeechReference {
  if (typeof reference === 'string') {
    return {text: reference}
  }
  if (reference instanceof Blob || reference instanceof URL) {
    return {audio: reference}
  }
  return reference
}

/** Application-owned narrator; components only enqueue and subscribe, never own shared playback. */
export default class Narrator implements Disposable {
  getSnapshot = (): AudioQueueSnapshot<NarrationMetadata> => this.queue.getSnapshot()
  readonly queue: AudioQueue<NarrationMetadata>
  subscribe = (listener: () => void) => this.queue.subscribe(listener)
  private disposed = false
  private enabledValue: boolean

  private observed = new WeakSet<AudioHandle>

  private spoken = new Set<string>
  constructor(private readonly options: NarratorOptions = {}) {
    this.queue = new AudioQueue(options)
    this.enabledValue = options.enabled ?? true
  }

  get appendedSilence() {
    return this.queue.appendedSilence
  }
  set appendedSilence(value: number) {
    this.queue.appendedSilence = value
  }
  get enabled() {
    return this.enabledValue
  }
  set enabled(value: boolean) {
    this.enabledValue = value
    if (!value) {
      this.stop('disabled')
    }
  }
  get gap() {
    return this.queue.gap
  }
  set gap(value: number) {
    this.queue.gap = value
  }

  get prependedSilence() {
    return this.queue.prependedSilence
  }
  set prependedSilence(value: number) {
    this.queue.prependedSilence = value
  }
  clearHistory() {
    this.spoken.clear()
  }
  dispose() {
    if (this.disposed) {
      return
    }
    this.disposed = true
    this.queue.dispose()
    this.spoken.clear()
  }
  forget(key: string) {
    this.spoken.delete(key)
  }

  hasSpoken(key: string) {
    return this.spoken.has(key)
  }

  push(input: NarrationInput, options: NarrationPushOptions = {}): AudioHandle {
    if (this.disposed) {
      throw new Error('Cannot push to a disposed narrator.')
    }
    if (!this.enabled) {
      return {
        id: crypto.randomUUID(),
        finished: Promise.resolve({
          status: 'skipped',
          reason: 'disabled',
        }),
        cancel() {},
      }
    }
    if (!options.repeat && options.once !== undefined && this.spoken.has(options.once)) {
      return {
        id: `remembered:${options.once}`,
        finished: Promise.resolve({
          status: 'skipped',
          reason: 'remembered',
        }),
        cancel() {},
      }
    }
    const immediate = typeof input === 'function' ? undefined : normalize(input)
    let metadata: NarrationMetadata = {
      id: options.id ?? crypto.randomUUID(),
      title: options.title ?? immediate?.title ?? immediate?.text?.slice(0, 100) ?? 'Narration',
      text: immediate?.text,
      source: null,
    }
    const handle = this.queue.push(async context => {
      const {signal} = context
      const reference = immediate ?? normalize(await (input as (signal: AbortSignal) => NarrationReference | Promise<NarrationReference>)(signal))
      signal.throwIfAborted()
      const update = (patch: Partial<NarrationMetadata>) => {
        metadata = {
          ...metadata,
          ...patch,
        }
        context.update(patch)
      }
      update({
        title: reference.title ?? options.title ?? reference.text?.slice(0, 100) ?? metadata.title,
        text: reference.text,
      })
      let speech: SpeechReference | undefined
      if ('audio' in reference) {
        if (reference.text) {
          speech = {text: reference.text}
        }
      } else {
        speech = reference
      }
      const native = async (error?: unknown): Promise<AudioPlayback> => {
        signal.throwIfAborted()
        if (!speech) {
          if (error === undefined) {
            throw new Error('No speech fallback is available.')
          }
          throw new Error('Narration playback failed and no speech fallback is available.', {cause: error})
        }
        if (error !== undefined) {
          this.options.onFallback?.(error)
        }
        const playback = await (this.options.createSpeech ?? browserSpeech)(speech, signal)
        update({source: 'browser'})
        return playback
      }
      const synthesize = speech?.synthesize === 'browser' ? undefined : speech?.synthesize ?? this.options.synthesize
      if (!('audio' in reference) && !synthesize) {
        return native()
      }
      let playback: AudioPlayback
      try {
        const audio = 'audio' in reference ? reference.audio : await synthesize!(reference, signal)
        signal.throwIfAborted()
        playback = await (this.options.createAudio ? this.options.createAudio(audio, signal) : audioFile<NarrationMetadata>(audio, this.options.audio)(context))
        if (signal.aborted) {
          void playback.finished.catch(() => {})
          playback.dispose()
          signal.throwIfAborted()
        }
        update({source: 'audio'})
      } catch (error) {
        signal.throwIfAborted()
        return native(error)
      }
      return speech ? fallbackPlayback(playback, native, signal) : playback
    }, {
      ...options,
      key: options.once === undefined ? options.key : `once:${options.once}`,
      metadata,
    })
    if (!this.observed.has(handle)) {
      this.observed.add(handle)
      void handle.finished.then(result => {
        if (!this.disposed && result.status === 'completed' && options.once !== undefined) {
          this.spoken.add(options.once)
        }
        if (result.status === 'failed') {
          this.options.onError?.(result.error, metadata)
        }
      }).catch(error => {
        console.error('Narrator observer failed.', error)
      })
    }
    return handle
  }
  stop(reason?: unknown) {
    this.queue.clear(reason)
  }
  [Symbol.dispose]() {
    this.dispose()
  }
}
