import type {SpeechReference} from './types.ts'
import type {AudioPlayback} from 'use-audio-queue/core'

let owner: symbol | undefined

/** Native speech has a single global lane. Pause releases it and saves the last word boundary. */
export function browserSpeech(speech: SpeechReference, signal: AbortSignal): AudioPlayback {
  signal.throwIfAborted()
  const synthesis = globalThis.speechSynthesis
  if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') {
    throw new Error('Browser speech is unavailable.')
  }
  const token = Symbol('speech')
  const completion = Promise.withResolvers<void>()
  void completion.promise.catch(() => {})
  let utterance: SpeechSynthesisUtterance | undefined
  let start: ReturnType<typeof Promise.withResolvers<void>> | undefined
  let offset = 0
  let disposed = false
  const detach = () => {
    if (utterance) {
      utterance.onstart = null
      utterance.onend = null
      utterance.onerror = null
      utterance.onboundary = null
      utterance = undefined
    }
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
      start = started
      utterance = current
      owner = token
      current.onstart = () => {
        if (utterance === current) {
          started.resolve()
        }
      }
      current.onboundary = event => {
        if (utterance === current) {
          offset = beginning + event.charIndex
        }
      }
      current.onend = () => {
        if (utterance !== current) {
          return
        }
        owner = undefined
        detach()
        started.resolve()
        completion.resolve()
      }
      current.onerror = event => {
        if (utterance !== current) {
          return
        }
        owner = undefined
        detach()
        const error = new Error(`Browser speech failed: ${event.error}`)
        started.reject(error)
        completion.reject(error)
      }
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
