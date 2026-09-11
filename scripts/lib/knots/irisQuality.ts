export type IrisTransport = 'openrouter' | 'xai'

type TimestampEnvelope = {
  audio: string
  audio_timestamps?: {
    graph_chars: Array<string>
    graph_times: Array<[number, number] | {end: number
      start: number}>
  }
  content_type: string
  duration: number
}

/** Offline review settings only. Do not change the approved in-game narrator preset. */
export function irisQualityRequest(transport: IrisTransport, text: string, {normalization = false, loud = true} = {}) {
  const input = loud ? `<loud>${text}</loud>` : text
  const options = {
    language: 'en',
    output_format: {
      codec: 'pcm',
      sample_rate: 48_000,
    },
    optimize_streaming_latency: 0,
    with_timestamps: true,
    text_normalization: normalization,
  }
  // Native speed remains 1.0. Raising speed or setting an MP3 bitrate does not improve PCM quality.
  if (transport === 'xai') {
    return {
      text: input,
      voice_id: 'iris',
      ...options,
    }
  }
  return {
    model: 'x-ai/grok-voice-tts-1.0',
    voice: 'iris',
    input,
    response_format: 'pcm',
    provider: {options: {xai: options}},
  }
}

/** Inspect the actual envelope, not OpenRouter’s sometimes incorrect audio/pcm HTTP header. */
export function decodeIrisQuality(bytes: Uint8Array) {
  const envelope = JSON.parse((new TextDecoder).decode(bytes)) as TimestampEnvelope
  if (typeof envelope.audio !== 'string' || !/^audio\/pcm(?:;|$)/iu.test(envelope.content_type) || !Number.isFinite(envelope.duration) || envelope.duration <= 0) {
    throw new Error('Expected a timed PCM envelope, not raw audio or a compressed codec.')
  }
  const pcm = Buffer.from(envelope.audio, 'base64')
  if (!pcm.byteLength || pcm.byteLength % 2) {
    throw new Error('Invalid 16-bit PCM payload.')
  }
  // The envelope lacks a rate field and the router can ignore the requested rate.
  // Infer it from the PCM frame count and the provider’s independently returned duration.
  const measuredRate = pcm.byteLength / 2 / envelope.duration
  const rates = [8000, 16_000, 22_050, 24_000, 44_100, 48_000]
  const sampleRate = rates.toSorted((a, b) => Math.abs(a - measuredRate) - Math.abs(b - measuredRate))[0]
  const duration = pcm.byteLength / 2 / sampleRate
  if (Math.abs(duration - envelope.duration) > 0.015) {
    throw new Error('PCM size and provider duration do not establish a supported mono sample rate.')
  }
  const {graph_chars: characters, graph_times: times} = envelope.audio_timestamps ?? {}
  if (!Array.isArray(characters) || !characters.length || !characters.every(char => typeof char === 'string') || !Array.isArray(times) || characters.length !== times.length) {
    throw new Error('Missing or mismatched character timestamps.')
  }
  const timestamps = characters.map((char, index) => {
    const pair = times[index]
    const start = Array.isArray(pair) ? pair[0] : pair.start
    const end = Array.isArray(pair) ? pair[1] : pair.end
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end > duration + 0.02) {
      throw new Error(`Invalid timestamp at character ${index}.`)
    }
    return {
      char,
      start,
      end,
    }
  })
  const uniformlySpaced = timestamps.every((time, index) => Math.abs(time.start - envelope.duration * index / timestamps.length) <= 0.0051 && Math.abs(time.end - envelope.duration * (index + 1) / timestamps.length) <= 0.0051)
  return {
    pcm,
    sampleRate,
    duration,
    providerDuration: envelope.duration,
    timestamps,
    uniformlySpaced,
  }
}
