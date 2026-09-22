export type VoiceSampleFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
export type VoiceSampleFormat = 'opus' | 'pcm' | 'wav'

export type VoiceSampleTiming = {
  char: string
  end: number
  start: number
}

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
  voice: string
}

export type VoiceSamplePluginOptions = {
  /** OpenRouter API key. Falls back to OPENROUTER_API_KEY from Vite env or process.env. */
  apiKey?: string
  /** Defaults used when the matching import attribute is omitted. */
  defaults?: Partial<Pick<VoiceSampleRequest, 'format' | 'language' | 'voice'>>
  /** Storage directory relative to the Vite root. */
  directory?: string
  /** Primarily a test seam; defaults to globalThis.fetch. */
  fetch?: VoiceSampleFetch
  /** ffmpeg executable used when format='opus'. */
  ffmpegPath?: string
  /** OpenRouter TTS model. */
  model?: string
}
