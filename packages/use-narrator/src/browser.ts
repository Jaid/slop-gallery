import type {SpeechReference} from './types.ts'
import type {AudioPlayback} from 'use-audio-queue/core'

let owner: symbol | undefined

/** Native speech has a single global lane. Pause releases it and saves the last word boundary. */
export function browserSpeech(speech: SpeechReference, signal: AbortSignal): AudioPlayback {
  signal.throwIfAborted()
  // The Web Speech API is missing in some browsers and in non-browser runtimes.
  const synthesis = globalThis.speechSynthesis as SpeechSynthesis | undefined
  if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') {
    throw new Error('Browser speech is unavailable.')
  }
  const token = Symbol('speech')
  const completion = Promise.withResolvers<void>()
  void completion.promise.catch(() => {})
  let utterance: SpeechSynthesisUtterance | undefined
  let utteranceListeners: AbortController | undefined
  let start: ReturnType<typeof Promise.withResolvers<void>> | undefined
  let offset = 0
  let disposed = false
  const detach = () => {
    utteranceListeners?.abort()
    utteranceListeners = undefined
    utterance = undefined
  }
  const pause = () => {
    detach()
    start?.resolve()
    start = undefined
    if (owner === token) {
      owner = undefined
      // Unlike synthesis.pause(), cancellation allows an injected utterance to use the global lane.
      synthesis.cancel()
    }
  }
  const dispose = () => {
    if (disposed) {
      return
    }
    disposed = true
    signal.removeEventListener('abort', dispose)
    pause()
    completion.resolve()
  }
  signal.addEventListener('abort', dispose, {once: true})
  return {
    finished: completion.promise,
    play: () => {
      signal.throwIfAborted()
      if (disposed) {
        throw new Error('Speech playback was disposed.')
      }
      if (utterance && owner === token) {
        return start!.promise
      }
      if (owner || synthesis.speaking || synthesis.pending || synthesis.paused) {
        throw new Error('Browser speech cannot overlap another utterance. Use synthesized audio for concurrent TTS.')
      }
      const current = new SpeechSynthesisUtterance(speech.text.slice(offset))
      const beginning = offset
      current.lang = speech.lang ?? 'en-GB'
      current.rate = speech.rate ?? 1
      current.pitch = speech.pitch ?? 1
      const voices = synthesis.getVoices()
      current.voice = (speech.voice ? voices.find(voice => voice.voiceURI === speech.voice || voice.name === speech.voice) : voices.find(voice => voice.lang === current.lang && voice.localService) ?? voices.find(voice => voice.lang.startsWith(current.lang.split('-')[0]))) ?? null
      const started = Promise.withResolvers<void>()
      void started.promise.catch(() => {})
      const currentListeners = new AbortController
      const listenerOptions = {signal: currentListeners.signal}
      start = started
      utterance = current
      utteranceListeners = currentListeners
      owner = token
      current.addEventListener('start', () => {
        if (utterance === current) {
          started.resolve()
        }
      }, listenerOptions)
      current.addEventListener('boundary', event => {
        if (utterance === current) {
          offset = beginning + event.charIndex
        }
      }, listenerOptions)
      current.addEventListener('end', () => {
        if (utterance !== current) {
          return
        }
        owner = undefined
        detach()
        started.resolve()
        completion.resolve()
      }, listenerOptions)
      current.addEventListener('error', event => {
        if (utterance !== current) {
          return
        }
        owner = undefined
        detach()
        const error = new Error(`Browser speech failed: ${event.error}`)
        started.reject(error)
        completion.reject(error)
      }, listenerOptions)
      try {
        synthesis.speak(current)
      } catch (error) {
        owner = undefined
        detach()
        started.reject(error)
        completion.reject(error)
      }
      return started.promise
    },
    pause,
    dispose,
  }
}
