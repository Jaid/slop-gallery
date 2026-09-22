import type {VoiceSampleFetch, VoiceSampleRequest} from './types.ts'

import {execFile} from 'node:child_process'
import {createHash, randomUUID} from 'node:crypto'
import {resolve} from 'node:path'
import {promisify} from 'node:util'

import fs from 'fs-extra'

import {styleVoiceSampleText} from './emotion.ts'

const execFileAsync = promisify(execFile)
const modelDefault = 'x-ai/grok-voice-tts-1.0'
const cacheSchema = 1
const hasFile = async (file: string) => {
  try {
    const information = await fs.stat(file)
    return information.size > 0
  } catch {
    return false
  }
}
const extensionFor = (request: VoiceSampleRequest) => request.format
const supportedSampleRates = new Set([8000, 16_000, 22_050, 24_000, 44_100, 48_000])
const pcmRate = (contentType: string | null) => {
  if (!contentType || !/^audio\/pcm(?:;|$)/iu.test(contentType)) {
    throw new Error('OpenRouter voice synthesis did not return raw PCM audio.')
  }
  const channels = /;\s*channels=(\d+)/iu.exec(contentType)?.[1]
  const rate = /;\s*rate=(\d+)/iu.exec(contentType)?.[1]
  const sampleRate = rate ? Number(rate) : undefined
  if (channels && channels !== '1' || !sampleRate || !supportedSampleRates.has(sampleRate)) {
    throw new Error('OpenRouter voice synthesis returned PCM without a supported mono sample rate.')
  }
  return sampleRate
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
  readonly #pending = new Map<string, Promise<string>>

  constructor(options: VoiceSampleCacheOptions) {
    this.#apiKey = options.apiKey
    this.#cacheDir = options.cacheDir
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.#ffmpegPath = options.ffmpegPath ?? 'ffmpeg'
    this.#model = options.model ?? modelDefault
  }

  async get(request: VoiceSampleRequest) {
    const key = this.key(request)
    const output = this.path(request, key)
    if (await hasFile(output)) {
      return output
    }
    const existing = this.#pending.get(key)
    if (existing) {
      return existing
    }
    const pending = this.#generate(request, output)
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

  async #generate(request: VoiceSampleRequest, output: string) {
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
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (!bytes.byteLength) {
      throw new Error('OpenRouter voice synthesis returned an empty response.')
    }
    const sampleRate = pcmRate(response.headers.get('content-type'))
    const wav = request.format === 'pcm' ? undefined : wavFromPcm(bytes, sampleRate)
    const token = `${process.pid}-${randomUUID()}`
    const temporary = `${output}.${token}.tmp`
    try {
      if (request.format === 'opus') {
        const source = `${output}.${token}.source.wav`
        try {
          await fs.writeFile(source, wav!)
          await execFileAsync(this.#ffmpegPath, [
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            source,
            '-map',
            '0:a:0',
            '-c:a',
            'libopus',
            '-b:a',
            '80000',
            '-vbr',
            'on',
            '-compression_level',
            '10',
            '-application',
            'audio',
            '-f',
            'opus',
            '-y',
            temporary,
          ])
        } finally {
          await fs.remove(source)
        }
      } else {
        await fs.writeFile(temporary, request.format === 'wav' ? wav! : bytes)
      }
      if (!await hasFile(temporary)) {
        throw new Error(`Voice sample generation did not produce a valid .${request.format} file.`)
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
}
