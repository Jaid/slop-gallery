import type {VoiceSampleImportKind} from './imports.ts'
import type {VoiceSampleFormat, VoiceSamplePluginOptions, VoiceSampleRequest} from './types.ts'
import type {Plugin, ResolvedConfig} from 'vite'

import {isAbsolute, resolve} from 'node:path'

import {parse} from '@babel/parser'
import {loadEnv, normalizePath} from 'vite'

import {applyEdits, parseVoiceSampleImports, virtualVoiceSamplePrefix, voiceSampleSource} from './imports.ts'
import VoiceSampleCache from './VoiceSampleCache.ts'

export {voiceSampleSource} from './imports.ts'
export type {VoiceSampleFormat, VoiceSampleMetadata, VoiceSamplePluginOptions, VoiceSampleRequest, VoiceSampleTiming} from './types.ts'

const resolvedVirtualPrefix = `\0${virtualVoiceSamplePrefix}`

type VirtualParts = {
  format?: VoiceSampleFormat
  key: string
  kind: VoiceSampleImportKind
}

const voiceSampleFormats = new Set<VoiceSampleFormat>(['opus', 'pcm', 'wav'])
const virtualParts = (source: string): VirtualParts | undefined => {
  const normalized = source.startsWith('\0') ? source.slice(1) : source
  if (!normalized.startsWith(virtualVoiceSamplePrefix)) {
    return
  }
  const parts = normalized.slice(virtualVoiceSamplePrefix.length).split('/')
  if (parts[0] === 'timings' && parts.length === 2 && parts[1]) {
    return {
      key: parts[1],
      kind: 'timings',
    }
  }
  if (parts[0] === 'audio' && parts.length === 3 && parts[1] && voiceSampleFormats.has(parts[1] as VoiceSampleFormat) && parts[2]) {
    return {
      format: parts[1] as VoiceSampleFormat,
      key: parts[2],
      kind: 'audio',
    }
  }
}

/**
 * Turns declarative voice-sample imports into stored raw WAVs, cached requested conversions and timing modules.
 *
 * Example:
 * import audio from 'voice-sample:greeting' with {text: 'Hello', voice: 'iris', format: 'opus'}
 * import timings from 'voice-sample:greeting/timings' with {text: 'Hello', voice: 'iris', format: 'opus'}
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
      if (!/\.[cm]?[jt]sx?(?:\?|$)/u.test(id) || id.includes('/node_modules/') || !code.includes(voiceSampleSource)) {
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
        const virtualSource = item.kind === 'timings' ? `${virtualVoiceSamplePrefix}timings/${key}` : `${virtualVoiceSamplePrefix}audio/${item.request.format}/${key}`
        return [
          {
            ...source,
            text: JSON.stringify(virtualSource),
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
        this.error(`Unknown voice sample virtual module "${source}".`)
      }
      if (parts.kind === 'timings') {
        return `${resolvedVirtualPrefix}timings/${parts.key}`
      }
      const entry = await cache.getAudio({
        ...request,
        format: parts.format!,
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
      if (parts?.kind !== 'timings') {
        return
      }
      const request = requests.get(parts.key)
      if (!request) {
        this.error(`Unknown voice sample timing module "${id}".`)
      }
      const entry = await cache.getTimings(request)
      this.addWatchFile(entry.rawPath)
      this.addWatchFile(entry.metadataPath)
      return `export default ${JSON.stringify(entry.timings)}`
    },
  }
}
