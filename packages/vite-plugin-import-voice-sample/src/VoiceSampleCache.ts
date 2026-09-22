import type {VoiceSampleAudioFormat, VoiceSampleFetch, VoiceSampleMetadata, VoiceSampleRequest, VoiceSampleTiming} from './types.ts'

import {execFile} from 'node:child_process'
import {createHash, randomUUID} from 'node:crypto'
import {resolve} from 'node:path'
import {promisify} from 'node:util'

import fs from 'fs-extra'
import makeArgv from 'make-argv'
import {pack, unpack} from 'msgpackr'

import {styleVoiceSampleText} from './emotion.ts'

const execFileAsync = promisify(execFile)
const modelDefault = 'x-ai/grok-voice-tts-1.0'
const storageSchema = 3
const conversionSchema = 1
const defaultSampleRate = 48_000
const commonSampleRates = [8000, 16_000, 22_050, 24_000, 32_000, 44_100, 48_000]

export const defaultVoiceSampleBitrate = (sampleRate: number) => Math.round(0.68266 * sampleRate)

export type VoiceSampleCacheEntry = {
  audioPath: string
  metadataPath: string
  rawPath: string
  timings: ReadonlyArray<VoiceSampleTiming>
}

type StoredVoiceSample = {
  metadata: VoiceSampleMetadata
  metadataPath: string
  rawPath: string
}

const hasFile = async (file: string) => {
  try {
    const information = await fs.stat(file)
    return information.size > 0
  } catch {
    return false
  }
}
const decodeBase64 = (value: unknown) => {
  if (typeof value !== 'string' || value.length % 4 || !/^(?:[\d+/A-Za-z]{4})*(?:[\d+/A-Za-z]{2}==|[\d+/A-Za-z]{3}=)?$/u.test(value)) {
    throw new Error('OpenRouter voice synthesis returned invalid base64 audio.')
  }
  return Uint8Array.fromBase64(value)
}
const decodeTimings = (value: unknown): Array<VoiceSampleTiming> => {
  if (!value || typeof value !== 'object' || !('graph_chars' in value) || !('graph_times' in value)) {
    throw new Error('OpenRouter voice synthesis returned invalid character timings.')
  }
  const {graph_chars: characters, graph_times: times} = value
  if (!Array.isArray(characters) || !Array.isArray(times) || characters.length !== times.length) {
    throw new Error('OpenRouter voice synthesis returned mismatched character timings.')
  }
  return characters.map((char, index) => {
    const pair: unknown = times[index]
    if (!pair || typeof pair !== 'object') {
      throw new Error('OpenRouter voice synthesis returned an invalid timestamp pair.')
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
      throw new Error('OpenRouter voice synthesis returned invalid character timings.')
    }
    return {
      char,
      end,
      start,
    }
  })
}
const decodeMetadata = (value: unknown): VoiceSampleMetadata => {
  if (!value || typeof value !== 'object' || !('duration' in value) || !('sampleRate' in value) || !('timings' in value)) {
    throw new TypeError('Stored voice sample metadata is invalid.')
  }
  const {duration, sampleRate, timings, ...rest} = value
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || typeof sampleRate !== 'number' || !Number.isSafeInteger(sampleRate) || sampleRate <= 0) {
    throw new TypeError('Stored voice sample metadata is invalid.')
  }
  if (!Array.isArray(timings)) {
    throw new TypeError('Stored voice sample timings are invalid.')
  }
  const timingItems = timings as Array<unknown>
  const decodedTimings = timingItems.map(item => {
    if (!item || typeof item !== 'object' || !('char' in item) || !('start' in item) || !('end' in item)) {
      throw new TypeError('Stored voice sample timings are invalid.')
    }
    const {char, start, end} = item
    if (typeof char !== 'string' || typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end > duration + 0.02) {
      throw new TypeError('Stored voice sample timings are invalid.')
    }
    return {
      char,
      end,
      start,
    }
  })
  const traceId = 'traceId' in rest ? rest.traceId : undefined
  if (traceId !== undefined && typeof traceId !== 'string') {
    throw new TypeError('Stored voice sample trace ID is invalid.')
  }
  return {
    duration,
    sampleRate,
    timings: decodedTimings,
    ...traceId ? {traceId} : {},
  }
}
const decodeEnvelope = (value: unknown, requestedSampleRate: number, traceId?: string) => {
  if (!value || typeof value !== 'object' || !('audio' in value) || !('duration' in value) || !('content_type' in value) || !('audio_timestamps' in value) || typeof value.content_type !== 'string' || !/^audio\/pcm(?:;|$)/iu.test(value.content_type) || typeof value.duration !== 'number' || !Number.isFinite(value.duration) || value.duration <= 0) {
    throw new Error('OpenRouter voice synthesis returned an invalid timed PCM envelope.')
  }
  const pcm = decodeBase64(value.audio)
  const duration = value.duration
  const inferredRate = pcm.byteLength / 2 / duration
  const sampleRates = [...new Set([...commonSampleRates, requestedSampleRate])]
  const sampleRate = sampleRates.toSorted((a, b) => Math.abs(a - inferredRate) - Math.abs(b - inferredRate))[0]
  if (Math.abs(pcm.byteLength / 2 / sampleRate - duration) > 0.015) {
    throw new Error('OpenRouter PCM length and duration do not establish a supported sample rate.')
  }
  const timings = decodeTimings(value.audio_timestamps)
  if (timings.some(timing => timing.end > duration + 0.02)) {
    throw new Error('OpenRouter character timing exceeds the audio duration.')
  }
  const metadata: VoiceSampleMetadata = {
    duration,
    sampleRate,
    timings,
    ...traceId ? {traceId} : {},
  }
  return {
    metadata,
    pcm,
  }
}
const wavFromPcm = (pcm: Uint8Array, sampleRate: number) => {
  if (!pcm.byteLength || pcm.byteLength % 2 || pcm.byteLength > 0xFF_FF_FF_FF - 36) {
    throw new Error('OpenRouter voice synthesis returned invalid 16-bit PCM.')
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
  return wav
}
const pcmFromWav = (wav: Uint8Array) => {
  if (wav.byteLength < 44) {
    throw new Error('Stored WAV is truncated.')
  }
  const view = Buffer.from(wav.buffer, wav.byteOffset, wav.byteLength)
  if (view.toString('ascii', 0, 4) !== 'RIFF' || view.toString('ascii', 8, 12) !== 'WAVE' || view.toString('ascii', 12, 16) !== 'fmt ' || view.readUInt32LE(16) !== 16 || view.readUInt16LE(20) !== 1 || view.readUInt16LE(22) !== 1 || view.readUInt16LE(34) !== 16 || view.toString('ascii', 36, 40) !== 'data') {
    throw new Error('Stored WAV is not canonical mono 16-bit PCM.')
  }
  const dataSize = view.readUInt32LE(40)
  if (dataSize === 0 || 44 + dataSize !== view.byteLength || dataSize % 2) {
    throw new Error('Stored WAV has invalid PCM data.')
  }
  return Uint8Array.from(view.subarray(44))
}

export type VoiceSampleCacheOptions = {
  apiKey?: string
  bitrate?: number
  directory: string
  fetch?: VoiceSampleFetch
  ffmpegPath?: string
  model?: string
  sampleRate?: number
}

export default class VoiceSampleCache {
  readonly #apiKey?: string
  readonly #bitrate: number
  readonly #cacheDirectory: string
  readonly #fetch: VoiceSampleFetch
  readonly #ffmpegPath: string
  readonly #model: string
  readonly #pendingConversions = new Map<string, Promise<string>>
  readonly #pendingStores = new Map<string, Promise<StoredVoiceSample>>
  readonly #sampleRate: number
  readonly #storeDirectory: string

  constructor(options: VoiceSampleCacheOptions) {
    this.#apiKey = options.apiKey
    this.#sampleRate = options.sampleRate ?? defaultSampleRate
    if (!Number.isSafeInteger(this.#sampleRate) || this.#sampleRate <= 0) {
      throw new TypeError('Voice sample sampleRate must be a positive integer.')
    }
    this.#bitrate = options.bitrate ?? defaultVoiceSampleBitrate(this.#sampleRate)
    if (!Number.isSafeInteger(this.#bitrate) || this.#bitrate <= 0) {
      throw new TypeError('Voice sample bitrate must be a positive integer.')
    }
    this.#storeDirectory = resolve(options.directory, 'store')
    this.#cacheDirectory = resolve(options.directory, 'cache')
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.#ffmpegPath = options.ffmpegPath ?? 'ffmpeg'
    this.#model = options.model ?? modelDefault
  }

  cacheKey(key: string, format: Exclude<VoiceSampleAudioFormat, 'wav'>) {
    if (format === 'pcm') {
      return key
    }
    return createHash('sha256').update(JSON.stringify({
      bitrate: this.#bitrate,
      conversionSchema,
      format,
      source: key,
    })).digest('hex')
  }

  async getAudio(request: VoiceSampleRequest & {format: VoiceSampleAudioFormat}): Promise<VoiceSampleCacheEntry> {
    const key = this.key(request)
    const stored = await this.#getStored(request, key)
    const audioPath = await this.#getAudio(request.format, key, stored.rawPath)
    return {
      audioPath,
      metadataPath: stored.metadataPath,
      rawPath: stored.rawPath,
      timings: stored.metadata.timings,
    }
  }

  async getTimings(request: VoiceSampleRequest) {
    const stored = await this.#getStored(request, this.key(request))
    return {
      metadataPath: stored.metadataPath,
      rawPath: stored.rawPath,
      timings: stored.metadata.timings,
    }
  }

  key(request: VoiceSampleRequest) {
    const {format: _format, type: _type, ...synthesis} = request
    return createHash('sha256').update(JSON.stringify({
      model: this.#model,
      ...this.#sampleRate === defaultSampleRate ? {} : {sampleRate: this.#sampleRate},
      storageSchema,
      synthesis,
    })).digest('hex')
  }

  metadataPath(key: string) {
    return resolve(this.#storeDirectory, `${key}.msgpack`)
  }

  rawPath(key: string) {
    return resolve(this.#storeDirectory, `${key}.wav`)
  }

  #cachePath(key: string, format: Exclude<VoiceSampleAudioFormat, 'wav'>) {
    return resolve(this.#cacheDirectory, `${this.cacheKey(key, format)}.${format}`)
  }

  async #convert(format: Exclude<VoiceSampleAudioFormat, 'wav'>, key: string, rawPath: string) {
    const output = this.#cachePath(key, format)
    if (await hasFile(output)) {
      return output
    }
    await fs.ensureDir(this.#cacheDirectory)
    const token = `${process.pid}-${randomUUID()}`
    const temporary = `${output}.${token}.tmp`
    try {
      if (format === 'opus') {
        const argv = makeArgv({
          hide_banner: true,
          loglevel: 'error',
          i: rawPath,
          map: '0:a:0',
          'c:a': 'libopus',
          'b:a': this.#bitrate,
          vbr: 'on',
          compression_level: 10,
          application: 'audio',
          f: 'opus',
          y: true,
        }, {
          prefix: '-',
          keyStyle: false,
        })
        await execFileAsync(this.#ffmpegPath, [...argv, temporary])
      } else {
        const wav = new Uint8Array(await fs.readFile(rawPath))
        await fs.writeFile(temporary, pcmFromWav(wav))
      }
      if (!await hasFile(temporary)) {
        throw new Error(`Voice sample conversion did not produce a valid .${format} file.`)
      }
      if (await hasFile(output)) {
        return output
      }
      try {
        await fs.rename(temporary, output)
      } catch (error) {
        if (!await hasFile(output)) {
          throw error
        }
      }
      return output
    } finally {
      await fs.remove(temporary)
    }
  }

  async #generateStored(request: VoiceSampleRequest, key: string): Promise<StoredVoiceSample> {
    if (!this.#apiKey) {
      throw new Error('OPENROUTER_API_KEY is required to generate an uncached voice sample.')
    }
    await fs.ensureDir(this.#storeDirectory)
    const response = await this.#fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://slop.gallery',
        'X-OpenRouter-Title': 'Slop Gallery',
        'X-OpenRouter-Cache': 'true',
        'X-OpenRouter-Cache-TTL': '86400',
      },
      body: JSON.stringify({
        model: this.#model,
        input: styleVoiceSampleText(request.text, request.emotion),
        voice: request.voice,
        response_format: 'pcm',
        provider: {
          options: {
            xai: {
              language: request.language,
              optimize_streaming_latency: 0,
              output_format: {
                codec: 'pcm',
                sample_rate: this.#sampleRate,
              },
              with_timestamps: true,
            },
          },
        },
      }),
    })
    if (!response.ok) {
      const responseText = await response.text()
      const detail = responseText.slice(0, 1000)
      throw new Error(`OpenRouter voice synthesis failed (HTTP ${response.status})${detail ? `: ${detail}` : ''}.`)
    }
    const {metadata, pcm} = decodeEnvelope(await response.json(), this.#sampleRate, response.headers.get('x-generation-id') ?? undefined)
    const wav = wavFromPcm(pcm, metadata.sampleRate)
    const rawPath = this.rawPath(key)
    const metadataPath = this.metadataPath(key)
    const token = `${process.pid}-${randomUUID()}`
    const temporaryRaw = `${rawPath}.${token}.tmp`
    const temporaryMetadata = `${metadataPath}.${token}.tmp`
    try {
      await fs.writeFile(temporaryRaw, wav)
      await fs.writeFile(temporaryMetadata, pack(metadata))
      if (!await hasFile(temporaryRaw) || !await hasFile(temporaryMetadata)) {
        throw new Error('Voice sample generation did not produce a valid raw store entry.')
      }
      const raced = await this.#readStored(key)
      if (raced) {
        return raced
      }
      await fs.remove(rawPath)
      await fs.remove(metadataPath)
      await fs.rename(temporaryRaw, rawPath)
      await fs.rename(temporaryMetadata, metadataPath)
      return {
        metadata,
        metadataPath,
        rawPath,
      }
    } finally {
      await fs.remove(temporaryRaw)
      await fs.remove(temporaryMetadata)
    }
  }

  async #getAudio(format: VoiceSampleAudioFormat, key: string, rawPath: string) {
    if (format === 'wav') {
      return rawPath
    }
    const pendingKey = `${key}:${format}`
    const existing = this.#pendingConversions.get(pendingKey)
    if (existing) {
      return existing
    }
    const pending = this.#convert(format, key, rawPath)
    this.#pendingConversions.set(pendingKey, pending)
    try {
      return await pending
    } finally {
      this.#pendingConversions.delete(pendingKey)
    }
  }

  async #getStored(request: VoiceSampleRequest, key: string) {
    const cached = await this.#readStored(key)
    if (cached) {
      return cached
    }
    const existing = this.#pendingStores.get(key)
    if (existing) {
      return existing
    }
    const pending = this.#generateStored(request, key)
    this.#pendingStores.set(key, pending)
    try {
      return await pending
    } finally {
      this.#pendingStores.delete(key)
    }
  }

  async #readStored(key: string): Promise<StoredVoiceSample | undefined> {
    const rawPath = this.rawPath(key)
    const metadataPath = this.metadataPath(key)
    if (!await hasFile(rawPath) || !await hasFile(metadataPath)) {
      return
    }
    const metadata = decodeMetadata(unpack(await fs.readFile(metadataPath)) as unknown)
    return {
      metadata,
      metadataPath,
      rawPath,
    }
  }
}
