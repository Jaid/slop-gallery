import type {VoiceSampleLoadType, VoiceSamplePluginOptions, VoiceSampleRequest} from './types.ts'
import type {Plugin, ResolvedConfig} from 'vite'
import type {VoiceSampleFormat} from 'voice-sample-store'

import {createHash} from 'node:crypto'

import {parse} from '@babel/parser'
import fs from 'fs-extra'
import {loadEnv, normalizePath} from 'vite'
import VoiceSampleStore, {defaultVoiceSampleTrimThreshold} from 'voice-sample-store'

import {applyEdits, parseVoiceSampleImports, virtualVoiceSamplePrefix, voiceSourcePrefix} from './imports.ts'

export {voiceSourcePrefix} from './imports.ts'

export type {VoiceSampleContents, VoiceSampleLoadType, VoiceSamplePluginOptions, VoiceSampleRequest, VoiceSampleValue} from './types.ts'

const resolvedVirtualPrefix = `\0${virtualVoiceSamplePrefix}`
type VirtualParts = {
  format: VoiceSampleFormat
  key: string
  type: VoiceSampleLoadType
}

const voiceSampleFormats = new Set<VoiceSampleFormat>(['opus', 'pcm', 'timings', 'wav'])
const voiceSampleLoadTypes = new Set<VoiceSampleLoadType>(['contents', 'reference'])
const requestKey = (request: VoiceSampleRequest) => createHash('sha256').update(JSON.stringify(request)).digest('hex')
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
  let store: VoiceSampleStore
  const requests = new Map<string, VoiceSampleRequest>
  return {
    name: 'import-voice-sample',
    enforce: 'pre',
    configResolved(resolved) {
      config = resolved
      const env = loadEnv(config.mode, config.root, '')
      store = new VoiceSampleStore({
        rootFolder: config.root,
        apiKey: options.apiKey || env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY,
        app: options.app,
        bitrate: options.bitrate,
        cacheFolder: options.cacheFolder,
        cooldown: options.cooldown,
        defaults: {
          format: options.defaults?.format ?? 'opus',
          language: options.defaults?.language ?? 'en',
          voice: options.defaults?.voice ?? 'iris',
        },
        fetch: options.fetch,
        ffmpegPath: options.ffmpegPath,
        folder: options.folder ?? 'temp/vite-plugin-import-voice-sample',
        model: options.model,
        sampleRate: options.sampleRate,
        storageFolder: options.storageFolder,
        trim: options.trim,
        trimThreshold: options.trimThreshold,
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
        trim: options.trim ?? true,
        trimThreshold: options.trimThreshold ?? defaultVoiceSampleTrimThreshold,
        type: options.defaults?.type,
        voice: options.defaults?.voice ?? 'iris',
      })
      if (!parsed.length) {
        return
      }
      const edits = parsed.flatMap(item => {
        const key = requestKey(item.request)
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
        return `${resolvedVirtualPrefix + parts.format}/contents/${parts.key}`
      }
      const entry = await store.prepare(request)
      this.addWatchFile(entry.rawPath)
      this.addWatchFile(entry.metadataPath)
      if (entry.path !== entry.rawPath && entry.path !== entry.metadataPath) {
        this.addWatchFile(entry.path)
      }
      const assetId = `${normalizePath(entry.path)}?url`
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
      const entry = await store.prepare(request)
      this.addWatchFile(entry.rawPath)
      this.addWatchFile(entry.metadataPath)
      if (entry.path !== entry.rawPath && entry.path !== entry.metadataPath) {
        this.addWatchFile(entry.path)
      }
      if (parts.format === 'timings') {
        return `export default ${JSON.stringify(entry.metadata.timings)}`
      }
      const bytes = new Uint8Array(await fs.readFile(entry.path))
      const nodeLike = this.environment.config.consumer === 'server' && this.environment.config.resolve.builtins.includes('buffer')
      return binaryModule(bytes, nodeLike)
    },
  }
}

export {defaultVoiceSampleBitrate, defaultVoiceSampleCooldown, defaultVoiceSampleTrimThreshold, styleVoiceSampleText, voiceSampleTrimMinimumSilenceSeconds, voiceSampleTrimPaddingSeconds} from 'voice-sample-store'
export type {
  App,
  PreparedVoiceSample,
  ResolvedVoiceSampleRequest,
  VoiceSampleAudioFormat,
  VoiceSampleFetch,
  VoiceSampleFormat,
  VoiceSampleMetadata,
  VoiceSamplePrepareOptions,
  VoiceSampleStoreDefaults,
  VoiceSampleStoreOptions,
  VoiceSampleTiming,
  VoiceSampleTrimMetadata,
} from 'voice-sample-store'
