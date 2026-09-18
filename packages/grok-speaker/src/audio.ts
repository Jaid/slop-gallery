import type {CharacterTimestamp, GeneratedSpeech} from './types.ts'

export function decodeBase64(value: unknown) {
  if (typeof value !== 'string' || value.length % 4 || !/^(?:[\d+/A-Za-z]{4})*(?:[\d+/A-Za-z]{2}==|[\d+/A-Za-z]{3}=)?$/u.test(value)) {
    throw new Error('Invalid base64 audio.')
  }
  return Buffer.from(value, 'base64')
}

export function decodeTimestamps(value: unknown): Array<CharacterTimestamp> {
  if (!value || typeof value !== 'object' || !('graph_chars' in value) || !('graph_times' in value)) {
    throw new Error('Invalid character timestamps.')
  }
  const {graph_chars: characters, graph_times: times} = value
  if (!Array.isArray(characters) || !Array.isArray(times) || characters.length !== times.length) {
    throw new Error('Mismatched character timestamps.')
  }
  return characters.map((char, index) => {
    const pair: unknown = times[index]
    if (!pair || typeof pair !== 'object') {
      throw new Error('Invalid timestamp pair.')
    }
    let start: unknown
    let end: unknown
    if (Array.isArray(pair)) {
      start = pair[0]
      end = pair[1]
    } else if ('start' in pair && 'end' in pair) {
      start = pair.start
      end = pair.end
    }
    if (typeof char !== 'string' || typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
      throw new Error('Invalid character timestamp.')
    }
    return {
      char,
      start,
      end,
    }
  })
}

export function toWav(pcm: Uint8Array, sampleRate: number, timestamps: Array<CharacterTimestamp> = [], traceId?: string): GeneratedSpeech {
  if (!pcm.byteLength || pcm.byteLength % 2 || pcm.byteLength > 0xFF_FF_FF_FF - 36) {
    throw new Error('Expected nonempty, sample-aligned 16-bit PCM that fits in RIFF/WAVE.')
  }
  const wav = Buffer.alloc(44 + pcm.byteLength)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + pcm.byteLength, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(sampleRate, 24)
  wav.writeUInt32LE(sampleRate * 2, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(pcm.byteLength, 40)
  wav.set(pcm, 44)
  return {
    wav,
    sampleRate,
    duration: pcm.byteLength / 2 / sampleRate,
    timestamps,
    traceId,
  }
}

/** The router may label JSON as audio/pcm and silently ignore the requested rate. */
export function decodeEnvelope(value: unknown, traceId?: string) {
  if (!value || typeof value !== 'object' || !('audio' in value) || !('duration' in value) || !('content_type' in value) || typeof value.content_type !== 'string' || !/^audio\/pcm(?:;|$)/iu.test(value.content_type) || typeof value.duration !== 'number' || !Number.isFinite(value.duration) || value.duration <= 0) {
    throw new Error('Expected a timed PCM envelope.')
  }
  const pcm = decodeBase64(value.audio)
  const rate = pcm.byteLength / 2 / value.duration
  const rates = [8000, 16_000, 22_050, 24_000, 44_100, 48_000]
  const sampleRate = rates.toSorted((a, b) => Math.abs(a - rate) - Math.abs(b - rate))[0]
  if (Math.abs(pcm.byteLength / 2 / sampleRate - value.duration) > 0.015) {
    throw new Error('PCM length and duration do not establish a supported sample rate.')
  }
  const timestamps = decodeTimestamps('audio_timestamps' in value ? value.audio_timestamps : undefined)
  const duration = value.duration
  if (timestamps.some(time => time.end > duration + 0.02)) {
    throw new Error('Character timestamp exceeds the audio duration.')
  }
  return toWav(pcm, sampleRate, timestamps, traceId)
}

export function pcmRate(contentType: string | null, defaultRate?: number) {
  if (!contentType || !/^audio\/pcm(?:;|$)/iu.test(contentType)) {
    throw new Error('Expected raw PCM audio.')
  }
  const channels = /;\s*channels=(\d+)/iu.exec(contentType)?.[1]
  const rate = /;\s*rate=(\d+)/iu.exec(contentType)?.[1]
  const sampleRate = rate ? Number(rate) : defaultRate
  if (channels && channels !== '1' || !sampleRate || ![8000, 16_000, 22_050, 24_000, 44_100, 48_000].includes(sampleRate)) {
    throw new Error('Expected mono PCM with a supported sample rate.')
  }
  return sampleRate
}
