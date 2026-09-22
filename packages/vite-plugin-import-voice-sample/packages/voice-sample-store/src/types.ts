export type App = {
  title: string
  url: string
}

export type VoiceSampleFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
export type VoiceSampleAudioFormat = 'opus' | 'pcm' | 'wav'
export type VoiceSampleFormat = VoiceSampleAudioFormat | 'timings'

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

export type VoiceSampleMetadata = {
  duration: number
  input: string
  sampleRate: number
  timings: ReadonlyArray<VoiceSampleTiming>
  traceId?: string
  trim?: VoiceSampleTrimMetadata
  voice: string
}

export type VoiceSamplePrepareOptions = {
  emotion?: string
  format?: VoiceSampleFormat
  language?: string
  text: string
  trim?: boolean
  trimThreshold?: number
  voice?: string
}

export type ResolvedVoiceSampleRequest = {
  emotion?: string
  format: VoiceSampleFormat
  language: string
  text: string
  trim: boolean
  trimThreshold: number
  voice: string
}

export type VoiceSampleStoreDefaults = Partial<Pick<VoiceSamplePrepareOptions, 'format' | 'language' | 'voice'>>

export type VoiceSampleStoreOptions = {
  /** OpenRouter API key. Falls back to process.env.OPENROUTER_API_KEY. */
  apiKey?: string
  /** OpenRouter attribution. A URL string uses its hostname as the title. */
  app?: App | string
  /** Opus bitrate in bits/s. Defaults to Math.round(0.68266 * sampleRate). */
  bitrate?: number
  /** Conversion/trim cache folder. Defaults to <folder>/cache. */
  cacheFolder?: string
  /** Defaults used when prepare() omits the matching property. */
  defaults?: VoiceSampleStoreDefaults
  /** Primarily a test seam; defaults to globalThis.fetch. */
  fetch?: VoiceSampleFetch
  /** ffmpeg executable used when format='opus'. */
  ffmpegPath?: string
  /** Base folder. Defaults to <rootFolder>/temp/voice-sample-store. */
  folder?: string
  /** OpenRouter TTS model. */
  model?: string
  /** Root used to resolve relative folder options. */
  rootFolder: string
  /** Requested synthesis sample rate in Hz. Defaults to 24000. */
  sampleRate?: number
  /** Raw WAV + MessagePack folder. Defaults to <folder>/store. */
  storageFolder?: string
  /** Whether quiet outer edges are trimmed. Defaults to true. */
  trim?: boolean
  /** Trim threshold in dBFS. Defaults to -50. */
  trimThreshold?: number
}

export type PreparedVoiceSample = {
  format: VoiceSampleFormat
  metadata: VoiceSampleMetadata
  metadataPath: string
  path: string
  rawPath: string
}
