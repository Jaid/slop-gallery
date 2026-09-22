import type {
  App,
  PreparedVoiceSample,
  ResolvedVoiceSampleRequest,
  VoiceSampleFormat,
  VoiceSamplePrepareOptions,
  VoiceSampleStoreOptions,
} from './types.ts'

import {isAbsolute, resolve} from 'node:path'

import tinyhand from 'tinyhand'

import {styleVoiceSampleText} from './emotion.ts'
import {defaultVoiceSampleTrimThreshold} from './trim.ts'
import VoiceSampleCache, {defaultVoiceSampleCooldown} from './VoiceSampleCache.ts'

const defaultApp: App = {
  title: 'Slop Gallery',
  url: 'https://slop.gallery',
}
const formats = new Set<VoiceSampleFormat>(['opus', 'pcm', 'timings', 'wav'])
const resolveFromRoot = (root: string, path: string) => (isAbsolute(path) ? path : resolve(root, path))
const normalizeApp = (input: App | string): App => tinyhand((value: App | string): App => {
  if (typeof value === 'string') {
    const parsed = new URL(value)
    if (!parsed.hostname) {
      throw new TypeError('Voice sample app URL must have a hostname.')
    }
    return {
      title: parsed.hostname,
      url: value,
    }
  }
  if (!value.title) {
    throw new TypeError('Voice sample app title must not be empty.')
  }
  new URL(value.url)
  return value
}, input)

export default class VoiceSampleStore {
  readonly #cache: VoiceSampleCache
  readonly #defaults: {
    format: VoiceSampleFormat
    language: string
    trim: boolean
    trimThreshold: number
    voice: string
  }

  constructor(options: VoiceSampleStoreOptions) {
    if (!options.rootFolder) {
      throw new TypeError('Voice sample rootFolder must not be empty.')
    }
    const rootFolder = resolve(options.rootFolder)
    const folder = resolveFromRoot(rootFolder, options.folder ?? 'temp/voice-sample-store')
    const cacheFolder = options.cacheFolder ? resolveFromRoot(rootFolder, options.cacheFolder) : resolve(folder, 'cache')
    const cooldown = options.cooldown ?? defaultVoiceSampleCooldown
    if (!Number.isSafeInteger(cooldown) || cooldown < 0) {
      throw new TypeError('Voice sample cooldown must be a non-negative integer number of milliseconds.')
    }
    const storageFolder = options.storageFolder ? resolveFromRoot(rootFolder, options.storageFolder) : resolve(folder, 'store')
    const trimThreshold = options.trimThreshold ?? defaultVoiceSampleTrimThreshold
    if (!Number.isFinite(trimThreshold) || trimThreshold > 0) {
      throw new TypeError('Voice sample trimThreshold must be a finite dBFS value at or below 0.')
    }
    this.#defaults = {
      format: options.defaults?.format ?? 'opus',
      language: options.defaults?.language ?? 'en',
      trim: options.trim ?? true,
      trimThreshold,
      voice: options.defaults?.voice ?? 'iris',
    }
    if (!formats.has(this.#defaults.format)) {
      throw new TypeError(`Unsupported voice format "${this.#defaults.format}".`)
    }
    if (!this.#defaults.language) {
      throw new TypeError('Voice sample language must not be empty.')
    }
    if (!this.#defaults.voice) {
      throw new TypeError('Voice sample voice must not be empty.')
    }
    this.#cache = new VoiceSampleCache({
      apiKey: options.apiKey || process.env.OPENROUTER_API_KEY,
      app: normalizeApp(options.app ?? defaultApp),
      bitrate: options.bitrate,
      cacheFolder,
      cooldown,
      fetch: options.fetch,
      ffmpegPath: options.ffmpegPath,
      model: options.model,
      sampleRate: options.sampleRate,
      storageFolder,
    })
  }

  async prepare(options: VoiceSamplePrepareOptions): Promise<PreparedVoiceSample> {
    const request = this.#resolve(options)
    if (request.format === 'timings') {
      const entry = await this.#cache.getTimings(request)
      return {
        format: request.format,
        metadata: entry.metadata,
        metadataPath: entry.metadataPath,
        path: entry.metadataPath,
        rawPath: entry.rawPath,
      }
    }
    const entry = await this.#cache.getAudio({
      ...request,
      format: request.format,
    })
    return {
      format: request.format,
      metadata: entry.metadata,
      metadataPath: entry.metadataPath,
      path: entry.audioPath,
      rawPath: entry.rawPath,
    }
  }

  #resolve(options: VoiceSamplePrepareOptions): ResolvedVoiceSampleRequest {
    if (typeof options.text !== 'string' || !options.text.trim()) {
      throw new TypeError('Voice sample text must be a nonempty string.')
    }
    const format = options.format ?? this.#defaults.format
    if (!formats.has(format)) {
      throw new TypeError(`Unsupported voice format "${format}".`)
    }
    const language = options.language ?? this.#defaults.language
    if (!language) {
      throw new TypeError('Voice sample language must not be empty.')
    }
    const voice = options.voice ?? this.#defaults.voice
    if (!voice) {
      throw new TypeError('Voice sample voice must not be empty.')
    }
    const trim = options.trim ?? this.#defaults.trim
    if (typeof trim !== 'boolean') {
      throw new TypeError('Voice sample trim must be a boolean.')
    }
    const trimThreshold = options.trimThreshold ?? this.#defaults.trimThreshold
    if (!Number.isFinite(trimThreshold) || trimThreshold > 0) {
      throw new TypeError('Voice sample trimThreshold must be a finite dBFS value at or below 0.')
    }
    styleVoiceSampleText(options.text, options.emotion)
    return {
      format,
      language,
      text: options.text,
      trim,
      trimThreshold,
      voice,
      ...options.emotion ? {emotion: options.emotion} : {},
    }
  }
}
