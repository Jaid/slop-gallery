export type App = {
  title: string
  url: string
}

export type VoiceSampleFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
export type VoiceSampleAudioFormat = 'opus' | 'pcm' | 'wav'
export type VoiceSampleFormat = VoiceSampleAudioFormat | 'timings'
export type VoiceSampleLoadType = 'contents' | 'reference'

export type VoiceSampleTiming = {
  char: string
  end: number
  start: number
}

export type VoiceSampleTrimMetadata = {
  changed: boolean
  minimumSilenceSeconds: number
  paddingSeconds: number
  removedEndSeconds: number
  removedStartSeconds: number
  sourceDuration: number
  thresholdDb: number
}

export type VoiceSampleContents<Format extends VoiceSampleFormat> = Format extends 'timings' ? ReadonlyArray<VoiceSampleTiming> : Uint8Array
export type VoiceSampleValue<Format extends VoiceSampleFormat, Type extends VoiceSampleLoadType> = Type extends 'reference' ? string : VoiceSampleContents<Format>

export type VoiceSampleMetadata = {
  duration: number
  sampleRate: number
  timings: ReadonlyArray<VoiceSampleTiming>
  traceId?: string
  trim?: VoiceSampleTrimMetadata
}

export type VoiceSampleRequest = {
  emotion?: string
  format: VoiceSampleFormat
  language: string
  text: string
  trim: boolean
  trimThreshold: number
  type: VoiceSampleLoadType
  voice: string
}

export type VoiceSamplePluginOptions = {
  /** OpenRouter API key. Falls back to OPENROUTER_API_KEY from Vite env or process.env. */
  apiKey?: string
  /** OpenRouter attribution. A URL string uses its hostname as the title. */
  app?: App | string
  /** Opus bitrate in bits/s. Defaults to Math.round(0.68266 * sampleRate). */
  bitrate?: number
  /** Conversion cache folder. Defaults to <folder>/cache. */
  cacheFolder?: string
  /** Defaults used when the matching import attribute/path component is omitted. */
  defaults?: Partial<Pick<VoiceSampleRequest, 'format' | 'language' | 'type' | 'voice'>>
  /** Primarily a test seam; defaults to globalThis.fetch. */
  fetch?: VoiceSampleFetch
  /** ffmpeg executable used when format='opus'. */
  ffmpegPath?: string
  /** Base folder. Defaults to <Vite root>/temp/vite-plugin-import-voice-sample. */
  folder?: string
  /** OpenRouter TTS model. */
  model?: string
  /** Requested synthesis sample rate in Hz. Defaults to 24000. */
  sampleRate?: number
  /** Raw WAV + MessagePack folder. Defaults to <folder>/store. */
  storageFolder?: string
  /** Whether quiet outer edges are trimmed. Defaults to true. */
  trim?: boolean
  /** Trim threshold in dBFS. Defaults to -50. */
  trimThreshold?: number
}
