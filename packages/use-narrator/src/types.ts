import type {AudioFileOptions, AudioReference} from 'use-audio-queue/browser'
import type {AudioPlayback, AudioPushOptions, AudioQueueOptions} from 'use-audio-queue/core'

export type {AudioReference} from 'use-audio-queue/browser'
export type {AudioHandle, AudioPriority, AudioResult} from 'use-audio-queue/core'
export type SpeechReference = {
  lang?: string
  pitch?: number
  rate?: number
  /** Override the narrator's provider. 'browser' explicitly avoids remote generation. */
  synthesize?: SpeechSynthesizer | 'browser'
  text: string
  title?: string
  voice?: string
}
export type RecordingReference = {
  audio: AudioReference
  /** Used for readable UI metadata and as browser speech on recording failure. */
  text?: string
  title?: string
}
/** A bare string is spoken text. Use {audio: '/voice.opus'} for a string URL. */
export type NarrationReference = Blob | RecordingReference | SpeechReference | URL | string
export type NarrationInput = ((signal: AbortSignal) => NarrationReference | Promise<NarrationReference>) | NarrationReference
export type SpeechSynthesizer = (speech: SpeechReference, signal: AbortSignal) => AudioReference | Promise<AudioReference>
export type NarrationMetadata = {
  id: string
  /** Unique per accepted narration instance; suitable for UI keys and per-playback instrumentation. */
  instanceId: string
  source: 'audio' | 'browser' | null
  text?: string
  title: string
}
export type NarrationPushOptions = Omit<AudioPushOptions<NarrationMetadata>, 'metadata'> & {
  id?: string
  /** Session-local completion memory, plus deduplication while unfinished. */
  once?: string
  /** Replay a remembered entry, retaining its completion memory and in-flight deduplication. */
  repeat?: boolean
  title?: string
}
export type NarratorAudioOptions = Omit<AudioFileOptions, 'connect'> & {
  connect?: (audio: HTMLAudioElement, instanceId: string) => () => void
}
export type NarratorOptions = AudioQueueOptions & {
  audio?: NarratorAudioOptions
  /** Injectable transports keep the controller usable outside browsers and testable without sound. */
  createAudio?: (reference: AudioReference, signal: AbortSignal) => AudioPlayback | Promise<AudioPlayback>
  createSpeech?: (speech: SpeechReference, signal: AbortSignal) => AudioPlayback | Promise<AudioPlayback>
  enabled?: boolean
  onError?: (error: unknown, metadata: NarrationMetadata) => void
  onFallback?: (error: unknown) => void
  synthesize?: SpeechSynthesizer
}

export type NarrationState = NarrationMetadata & {status: 'after' | 'before' | 'playing' | 'preparing'}
