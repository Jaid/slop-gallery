import type {App, VoiceSampleFormat, VoiceSampleLoadType, VoiceSamplePluginOptions, VoiceSampleRequest} from './types.ts'
import type {Plugin, ResolvedConfig} from 'vite'

import {isAbsolute, resolve} from 'node:path'

import {parse} from '@babel/parser'
import fs from 'fs-extra'
import tinyhand from 'tinyhand'
import {loadEnv, normalizePath} from 'vite'

import {applyEdits, parseVoiceSampleImports, virtualVoiceSamplePrefix, voiceSourcePrefix} from './imports.ts'
import VoiceSampleCache from './VoiceSampleCache.ts'

export {voiceSourcePrefix} from './imports.ts'

export type {App, VoiceSampleAudioFormat, VoiceSampleContents, VoiceSampleFormat, VoiceSampleLoadType, VoiceSampleMetadata, VoiceSamplePluginOptions, VoiceSampleRequest, VoiceSampleTiming, VoiceSampleValue} from './types.ts'

const resolvedVirtualPrefix = `\0${virtualVoiceSamplePrefix}`
const defaultApp: App = {
  title: 'Slop Gallery',
  url: 'https://slop.gallery',
}

type VirtualParts = {
  format: VoiceSampleFormat
  key: string
  type: VoiceSampleLoadType
}

const voiceSampleFormats = new Set<VoiceSampleFormat>(['opus', 'pcm', 'timings', 'wav'])
const voiceSampleLoadTypes = new Set<VoiceSampleLoadType>(['contents', 'reference'])
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
const virtualParts = (source: string): VirtualParts | undefined => {
  const normalized = source.startsWith('\0') ? source.slice(1) : source
  if (!normalized.startsWith(virtualVoiceSamplePrefix)) {
    return
  }
  const [format, type, key, ...rest] = normalized.slice(virtualVoiceSamplePrefix.length).split('/')
  if (rest.length || !format || !type || !key || !voiceSampleFormats.has(format as VoiceSampleFormat) || !voiceSampleLoadTypes.has(type as VoiceSampleLoadType)) {
    return
  }
  return {
    format: format as VoiceSampleFormat,
    key,
    type: type as VoiceSampleLoadType,
  }
}
const binaryModule = (bytes: Uint8Array, nodeLike: boolean) => {
  // Buffer encoding runs in the Vite host, where Node-compatible Buffer is available.
  // eslint-disable-next-line unicorn/prefer-uint8array-base64
  const base64 = Buffer.from(bytes).toString('base64')
  if (nodeLike) {
    return `import {Buffer} from 'node:buffer'; export default Buffer.from(${JSON.stringify(base64)}, 'base64')`
  }
  return `const binary=atob(${JSON.stringify(base64)});const bytes=new Uint8Array(binary.length);for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);export default bytes`
}

/**
 * Turns declarative voice imports into stored raw WAVs, cached requested conversions,
 * binary/object contents modules, and URL references.
 *
 * Examples:
 * import audioUrl from 'voice:greeting' with {text: 'Hello', format: 'opus'}
 * import audioBytes from 'voice:greeting' with {text: 'Hello', format: 'opus', type: 'contents'}
 * import timings from 'voice:greeting' with {text: 'Hello', format: 'timings'}
 * import timingsUrl from 'voice:greeting' with {text: 'Hello', format: 'timings', type: 'reference'}
 */
export default function importVoiceSample(options: VoiceSamplePluginOptions = {}): Plugin {
  let config: ResolvedConfig
  let cache: VoiceSampleCache
  const requests = new Map<string, VoiceSampleRequest>
  return {
    name: 'import-voice-sample',
    enforce: 'pre',
    configResolved(resolved) {
      config = resolved
      const env = loadEnv(config.mode, config.root, '')
      const folder = resolveFromRoot(config.root, options.folder ?? 'temp/vite-plugin-import-voice-sample')
      const cacheFolder = options.cacheFolder ? resolveFromRoot(config.root, options.cacheFolder) : resolve(folder, 'cache')
      const storageFolder = options.storageFolder ? resolveFromRoot(config.root, options.storageFolder) : resolve(folder, 'store')
      cache = new VoiceSampleCache({
        apiKey: options.apiKey || env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY,
        app: normalizeApp(options.app ?? defaultApp),
        bitrate: options.bitrate,
        cacheFolder,
        fetch: options.fetch,
        ffmpegPath: options.ffmpegPath,
        model: options.model,
        sampleRate: options.sampleRate,
        storageFolder,
      })
    },
    transform(code, id) {
      if (!/\.[cm]?[jt]sx?(?:\?|$)/u.test(id) || id.includes('/node_modules/') || !code.includes(voiceSourcePrefix)) {
        return
      }
      const ast = parse(code, {
        sourceType: 'unambiguous',
        plugins: [
          /\.[cm]?tsx?(?:\?|$)/u.test(id) ? 'typescript' : null,
          /\.[jt]sx(?:\?|$)/u.test(id) ? 'jsx' : null,
        ].filter(value => value !== null) as Array<'jsx' | 'typescript'>,
      })
      const parsed = parseVoiceSampleImports(code, ast.program, {
        format: options.defaults?.format ?? 'opus',
        language: options.defaults?.language ?? 'en',
        type: options.defaults?.type,
        voice: options.defaults?.voice ?? 'iris',
      })
      if (!parsed.length) {
        return
      }
      const edits = parsed.flatMap(item => {
        const key = cache.key(item.request)
        requests.set(key, item.request)
        const source = item.edits[0]
        return [
          {
            ...source,
            text: JSON.stringify(`${virtualVoiceSamplePrefix}${item.request.format}/${item.request.type}/${key}`),
          },
          item.edits[1],
        ]
      })
      return {
        code: applyEdits(code, edits),
        map: null,
      }
    },
    async resolveId(source, importer) {
      const parts = virtualParts(source)
      if (!parts) {
        return
      }
      const request = requests.get(parts.key)
      if (!request) {
        this.error(`Unknown voice virtual module "${source}".`)
      }
      if (parts.type === 'contents') {
        return `${resolvedVirtualPrefix}${parts.format}/contents/${parts.key}`
      }
      if (parts.format === 'timings') {
        const entry = await cache.getTimings(request)
        this.addWatchFile(entry.rawPath)
        this.addWatchFile(entry.metadataPath)
        const assetId = `${normalizePath(entry.metadataPath)}?url`
        const resolved = await this.resolve(assetId, importer, {skipSelf: true})
        return resolved?.id ?? assetId
      }
      const entry = await cache.getAudio({
        ...request,
        format: parts.format,
      })
      this.addWatchFile(entry.rawPath)
      this.addWatchFile(entry.metadataPath)
      if (entry.audioPath !== entry.rawPath) {
        this.addWatchFile(entry.audioPath)
      }
      const assetId = `${normalizePath(entry.audioPath)}?url`
      const resolved = await this.resolve(assetId, importer, {skipSelf: true})
      return resolved?.id ?? assetId
    },
    async load(id) {
      const parts = virtualParts(id)
      if (parts?.type !== 'contents') {
        return
      }
      const request = requests.get(parts.key)
      if (!request) {
        this.error(`Unknown voice contents module "${id}".`)
      }
      if (parts.format === 'timings') {
        const entry = await cache.getTimings(request)
        this.addWatchFile(entry.rawPath)
        this.addWatchFile(entry.metadataPath)
        return `export default ${JSON.stringify(entry.timings)}`
      }
      const entry = await cache.getAudio({
        ...request,
        format: parts.format,
      })
      this.addWatchFile(entry.rawPath)
      this.addWatchFile(entry.metadataPath)
      if (entry.audioPath !== entry.rawPath) {
        this.addWatchFile(entry.audioPath)
      }
      const bytes = new Uint8Array(await fs.readFile(entry.audioPath))
      const nodeLike = this.environment.config.consumer === 'server' && this.environment.config.resolve.builtins.includes('buffer')
      return binaryModule(bytes, nodeLike)
    },
  }
}

export {defaultVoiceSampleBitrate} from './VoiceSampleCache.ts'
