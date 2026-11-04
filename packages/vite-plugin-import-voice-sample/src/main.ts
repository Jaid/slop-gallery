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
// The one module every sample left out resolves to, whatever its format and type.
const omittedId = `${resolvedVirtualPrefix}omitted`
const omittedModule = 'export default undefined'
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
  const base64 = bytes.toBase64()
  if (nodeLike) {
    return `import {Buffer} from 'node:buffer'; export default Buffer.from(${JSON.stringify(base64)}, 'base64')`
  }
  return `export default Uint8Array.fromBase64(${JSON.stringify(base64)})`
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
  const enabled = options.enabled ?? true
  const requests = new Map<string, VoiceSampleRequest>
  const omittedKeys = new Set<string>
  const omissionReasons = new Set<string>
  const prepare = async (context: {warn: (message: string) => void}, key: string, request: VoiceSampleRequest) => {
    // Invalid attributes fail even samples that are left out, so they surface before a build that includes them.
    store.resolve(request)
    if (!enabled) {
      return
    }
    try {
      return await store.prepare(request)
    } catch (error) {
      if (!options.optional) {
        throw error
      }
      const reason = Error.isError(error) ? error.message : String(error)
      // Uncached samples usually all fail for the same reason, so each reason is only reported once.
      if (!omissionReasons.has(reason)) {
        omissionReasons.add(reason)
        context.warn(`Leaving out voice samples that cannot be fetched, starting with ${JSON.stringify(request.text)}: ${reason}`)
      }
      omittedKeys.add(key)
    }
  }
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
      const entry = await prepare(this, parts.key, request)
      if (!entry) {
        return omittedId
      }
      this.addWatchFile(entry.rawPath)
      this.addWatchFile(entry.metadataPath)
      if (entry.path !== entry.rawPath && entry.path !== entry.metadataPath) {
        this.addWatchFile(entry.path)
      }
      const assetId = `${normalizePath(entry.path)}?url`
      const resolved = await this.resolve(assetId, importer, {skipSelf: true})
      return resolved?.id ?? assetId
    },
    buildEnd() {
      if (omittedKeys.size) {
        this.warn(`${omittedKeys.size} voice ${omittedKeys.size === 1 ? 'sample was' : 'samples were'} left out.`)
      }
    },
    async load(id) {
      if (id === omittedId) {
        return omittedModule
      }
      const parts = virtualParts(id)
      if (parts?.type !== 'contents') {
        return
      }
      const request = requests.get(parts.key)
      if (!request) {
        this.error(`Unknown voice contents module "${id}".`)
      }
      const entry = await prepare(this, parts.key, request)
      if (!entry) {
        return omittedModule
      }
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
