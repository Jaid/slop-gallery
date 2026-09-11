export type Arrayable<T> = ReadonlyArray<T> | T
export type Provider = 'auto' | 'openrouter' | 'xai'
export type Modifier = 'build-intensity' | 'decrease-intensity' | 'emphasis' | 'fast' | 'higher-pitch' | 'loud' | 'lower-pitch' | 'sing-song' | 'singing' | 'slow' | 'soft' | 'whisper'
export type SpeakSegment = {
  modifier: Arrayable<Modifier>
  text: string
} | string
export type ActSegment = {
  action: 'breath' | 'chuckle' | 'cry' | 'exhale' | 'giggle' | 'hum-tune' | 'inhale' | 'laugh' | 'lip-smack' | 'long-pause' | 'pause' | 'sigh' | 'tongue-click' | 'tsk'
}
export type TextSegment = ActSegment | SpeakSegment
export type Text = Arrayable<TextSegment>
export type SpeakOptions = {
  signal?: AbortSignal
  /** Defaults to true, except for OpenRouter streaming, which cannot stream alignment metadata. */
  timestamps?: boolean
}
export type CharacterTimestamp = {
  char: string
  end: number
  /** Seconds, as reported by the provider. May include speech tags. */
  start: number
}
export type SpeechEvent = {
  /** Mono signed 16-bit little-endian PCM, always aligned to complete samples. */
  pcm: Uint8Array
  sampleRate: number
  type: 'audio'
} | {
  timestamps: Array<CharacterTimestamp>
  type: 'timestamps'
} | {
  traceId?: string
  type: 'done'
}
export type GeneratedSpeech = {
  duration: number
  sampleRate: number
  timestamps: Array<CharacterTimestamp>
  traceId?: string
  /** Lossless RIFF/WAVE wrapping of the provider’s mono 16-bit PCM. */
  wav: Uint8Array
}
