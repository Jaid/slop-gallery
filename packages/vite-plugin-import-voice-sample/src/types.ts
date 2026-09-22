export type VoiceSampleFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
export type VoiceSampleAudioFormat = 'opus' | 'pcm' | 'wav'
export type VoiceSampleFormat = VoiceSampleAudioFormat | 'timings'
export type VoiceSampleLoadType = 'contents' | 'reference'

export type VoiceSampleTiming = {
  char: string
  end: number
  start: number
}

export type VoiceSampleContents<Format extends VoiceSampleFormat> = Format extends 'timings' ? ReadonlyArray<VoiceSampleTiming> : Uint8Array
export type VoiceSampleValue<Format extends VoiceSampleFormat, Type extends VoiceSampleLoadType> = Type extends 'reference' ? string : VoiceSampleContents<Format>

export type VoiceSampleMetadata = {
  duration: number
  sampleRate: number
  timings: ReadonlyArray<VoiceSampleTiming>
  traceId?: string
}

export type VoiceSampleRequest = {
  emotion?: string
  format: VoiceSampleFormat
  language: string
  text: string
  type: VoiceSampleLoadType
  voice: string
}

export type VoiceSamplePluginOptions = {
  /** OpenRouter API key. Falls back to OPENROUTER_API_KEY from Vite env or process.env. */
  apiKey?: string
  /** Defaults used when the matching import attribute/path component is omitted. */
  defaults?: Partial<Pick<VoiceSampleRequest, 'format' | 'language' | 'type' | 'voice'>>
  /** Storage directory relative to the Vite root. */
  directory?: string
  /** Primarily a test seam; defaults to globalThis.fetch. */
  fetch?: VoiceSampleFetch
  /** ffmpeg executable used when format='opus'. */
  ffmpegPath?: string
  /** OpenRouter TTS model. */
  model?: string
}
