import type {VoiceSampleFetch, VoiceSampleRequest, VoiceSampleTiming} from './types.ts'

import {execFile} from 'node:child_process'
import {createHash, randomUUID} from 'node:crypto'
import {resolve} from 'node:path'
import {promisify} from 'node:util'

import fs from 'fs-extra'
import makeArgv from 'make-argv'

import {styleVoiceSampleText} from './emotion.ts'

const execFileAsync = promisify(execFile)
const modelDefault = 'x-ai/grok-voice-tts-1.0'
const cacheSchema = 2
const supportedSampleRates = [8000, 16_000, 22_050, 24_000, 44_100, 48_000]

export type VoiceSampleCacheEntry = {
  audioPath: string
  timings: ReadonlyArray<VoiceSampleTiming>
  timingsPath: string
}

const hasFile = async (file: string) => {
  try {
    const information = await fs.stat(file)
    return information.size > 0
  } catch {
    return false
  }
}
const extensionFor = (request: VoiceSampleRequest) => request.format
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
const decodeCachedTimings = (value: unknown): Array<VoiceSampleTiming> => {
  if (!Array.isArray(value)) {
    throw new TypeError('Cached voice sample timings are invalid.')
  }
  const items = value as Array<unknown>
  return items.map(item => {
    if (!item || typeof item !== 'object' || !('char' in item) || !('start' in item) || !('end' in item)) {
      throw new TypeError('Cached voice sample timings are invalid.')
    }
    const {char, start, end} = item
    if (typeof char !== 'string' || typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
      throw new TypeError('Cached voice sample timings are invalid.')
    }
    return {
      char,
      end,
      start,
    }
  })
}
const decodeEnvelope = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('audio' in value) || !('duration' in value) || !('content_type' in value) || !('audio_timestamps' in value) || typeof value.content_type !== 'string' || !/^audio\/pcm(?:;|$)/iu.test(value.content_type) || typeof value.duration !== 'number' || !Number.isFinite(value.duration) || value.duration <= 0) {
    throw new Error('OpenRouter voice synthesis returned an invalid timed PCM envelope.')
  }
  const pcm = decodeBase64(value.audio)
  const duration = value.duration
  const inferredRate = pcm.byteLength / 2 / duration
  const sampleRate = supportedSampleRates.toSorted((a, b) => Math.abs(a - inferredRate) - Math.abs(b - inferredRate))[0]
  if (Math.abs(pcm.byteLength / 2 / sampleRate - duration) > 0.015) {
    throw new Error('OpenRouter PCM length and duration do not establish a supported sample rate.')
  }
  const timings = decodeTimings(value.audio_timestamps)
  if (timings.some(timing => timing.end > duration + 0.02)) {
    throw new Error('OpenRouter character timing exceeds the audio duration.')
  }
  return {
    pcm,
    sampleRate,
    timings,
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

export type VoiceSampleCacheOptions = {
  apiKey?: string
  cacheDir: string
  fetch?: VoiceSampleFetch
  ffmpegPath?: string
  model?: string
}

export default class VoiceSampleCache {
  readonly #apiKey?: string
  readonly #cacheDir: string
  readonly #fetch: VoiceSampleFetch
  readonly #ffmpegPath: string
  readonly #model: string
  readonly #pending = new Map<string, Promise<VoiceSampleCacheEntry>>

  constructor(options: VoiceSampleCacheOptions) {
    this.#apiKey = options.apiKey
    this.#cacheDir = options.cacheDir
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.#ffmpegPath = options.ffmpegPath ?? 'ffmpeg'
    this.#model = options.model ?? modelDefault
  }

  async get(request: VoiceSampleRequest) {
    const key = this.key(request)
    const audioPath = this.path(request, key)
    const timingsPath = this.timingsPath(request, key)
    const cached = await this.#read(audioPath, timingsPath)
    if (cached) {
      return cached
    }
    const existing = this.#pending.get(key)
    if (existing) {
      return existing
    }
    const pending = this.#generate(request, audioPath, timingsPath)
    this.#pending.set(key, pending)
    try {
      return await pending
    } finally {
      this.#pending.delete(key)
    }
  }

  key(request: VoiceSampleRequest) {
    return createHash('sha256').update(JSON.stringify({
      cacheSchema,
      model: this.#model,
      request,
    })).digest('hex')
  }

  path(request: VoiceSampleRequest, key = this.key(request)) {
    return resolve(this.#cacheDir, `${key}.${extensionFor(request)}`)
  }

  timingsPath(request: VoiceSampleRequest, key = this.key(request)) {
    return resolve(this.#cacheDir, `${key}.timings.json`)
  }

  async #generate(request: VoiceSampleRequest, audioPath: string, timingsPath: string): Promise<VoiceSampleCacheEntry> {
    if (!this.#apiKey) {
      throw new Error('OPENROUTER_API_KEY is required to generate an uncached voice sample.')
    }
    await fs.ensureDir(this.#cacheDir)
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
                sample_rate: 48_000,
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
    const {pcm, sampleRate, timings} = decodeEnvelope(await response.json())
    const wav = request.format === 'pcm' ? undefined : wavFromPcm(pcm, sampleRate)
    const token = `${process.pid}-${randomUUID()}`
    const temporaryAudio = `${audioPath}.${token}.tmp`
    const temporaryTimings = `${timingsPath}.${token}.tmp`
    try {
      await fs.writeJson(temporaryTimings, timings)
      if (request.format === 'opus') {
        const source = `${audioPath}.${token}.source.wav`
        try {
          await fs.writeFile(source, wav!)
          const argv = makeArgv({
            hide_banner: true,
            loglevel: 'error',
            i: source,
            map: '0:a:0',
            'c:a': 'libopus',
            'b:a': 80_000,
            vbr: 'on',
            compression_level: 10,
            application: 'audio',
            f: 'opus',
            y: true,
          }, {
            prefix: '-',
            keyStyle: false,
          })
          await execFileAsync(this.#ffmpegPath, [...argv, temporaryAudio])
        } finally {
          await fs.remove(source)
        }
      } else {
        await fs.writeFile(temporaryAudio, request.format === 'wav' ? wav! : pcm)
      }
      if (!await hasFile(temporaryAudio) || !await hasFile(temporaryTimings)) {
        throw new Error(`Voice sample generation did not produce a valid .${request.format} file and timing map.`)
      }
      const raced = await this.#read(audioPath, timingsPath)
      if (raced) {
        return raced
      }
      await fs.remove(audioPath)
      await fs.remove(timingsPath)
      await fs.rename(temporaryAudio, audioPath)
      await fs.rename(temporaryTimings, timingsPath)
      return {
        audioPath,
        timings,
        timingsPath,
      }
    } finally {
      await fs.remove(temporaryAudio)
      await fs.remove(temporaryTimings)
    }
  }
  async #read(audioPath: string, timingsPath: string): Promise<VoiceSampleCacheEntry | undefined> {
    if (!await hasFile(audioPath) || !await hasFile(timingsPath)) {
      return
    }
    const timings = decodeCachedTimings(await fs.readJson(timingsPath) as unknown)
    return {
      audioPath,
      timings,
      timingsPath,
    }
  }
}
