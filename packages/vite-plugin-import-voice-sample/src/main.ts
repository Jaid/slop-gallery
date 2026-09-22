import type {VoiceSampleFormat, VoiceSamplePluginOptions, VoiceSampleRequest} from './types.ts'
import type {Plugin, ResolvedConfig} from 'vite'

import {isAbsolute, resolve} from 'node:path'

import {parse} from '@babel/parser'
import {loadEnv, normalizePath} from 'vite'

import {applyEdits, parseVoiceSampleImports, virtualVoiceSamplePrefix, voiceSourcePrefix} from './imports.ts'
import VoiceSampleCache from './VoiceSampleCache.ts'

export {voiceSourcePrefix} from './imports.ts'
export type {VoiceSampleAudioFormat, VoiceSampleFormat, VoiceSampleMetadata, VoiceSamplePluginOptions, VoiceSampleRequest, VoiceSampleTiming} from './types.ts'

const resolvedVirtualPrefix = `\0${virtualVoiceSamplePrefix}`

type VirtualParts = {
  format: VoiceSampleFormat
  key: string
}

const voiceSampleFormats = new Set<VoiceSampleFormat>(['opus', 'pcm', 'timings', 'wav'])
const virtualParts = (source: string): VirtualParts | undefined => {
  const normalized = source.startsWith('\0') ? source.slice(1) : source
  if (!normalized.startsWith(virtualVoiceSamplePrefix)) {
    return
  }
  const [format, key, ...rest] = normalized.slice(virtualVoiceSamplePrefix.length).split('/')
  if (rest.length || !format || !key || !voiceSampleFormats.has(format as VoiceSampleFormat)) {
    return
  }
  return {
    format: format as VoiceSampleFormat,
    key,
  }
}

/**
 * Turns declarative voice imports into stored raw WAVs, cached requested conversions and timing objects.
 *
 * Example:
 * import audio from 'voice:greeting' with {text: 'Hello', format: 'opus'}
 * import araAudio from 'voice:greeting/ara' with {text: 'Hello', format: 'opus'}
 * import timings from 'voice:greeting' with {text: 'Hello', format: 'timings'}
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
      const directoryOption = options.directory ?? 'temp/vite-plugin-import-voice-sample'
      const directory = isAbsolute(directoryOption) ? directoryOption : resolve(config.root, directoryOption)
      cache = new VoiceSampleCache({
        apiKey: options.apiKey || env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY,
        directory,
        fetch: options.fetch,
        ffmpegPath: options.ffmpegPath,
        model: options.model,
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
            text: JSON.stringify(`${virtualVoiceSamplePrefix}${item.request.format}/${key}`),
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
      if (parts.format === 'timings') {
        return `${resolvedVirtualPrefix}timings/${parts.key}`
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
      if (parts?.format !== 'timings') {
        return
      }
      const request = requests.get(parts.key)
      if (!request) {
        this.error(`Unknown voice timing module "${id}".`)
      }
      const entry = await cache.getTimings(request)
      this.addWatchFile(entry.rawPath)
      this.addWatchFile(entry.metadataPath)
      return `export default ${JSON.stringify(entry.timings)}`
    },
  }
}
