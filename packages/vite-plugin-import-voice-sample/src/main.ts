import type {VoiceSamplePluginOptions, VoiceSampleRequest} from './types.ts'
import type {Plugin, ResolvedConfig} from 'vite'

import {isAbsolute, resolve} from 'node:path'

import {parse} from '@babel/parser'
import {loadEnv, normalizePath} from 'vite'

import {applyEdits, parseVoiceSampleImports, virtualVoiceSamplePrefix, voiceSampleSource} from './imports.ts'
import VoiceSampleCache from './VoiceSampleCache.ts'

export {voiceSampleSource} from './imports.ts'
export type {VoiceSampleFormat, VoiceSamplePluginOptions, VoiceSampleRequest} from './types.ts'

const resolvedVirtualPrefix = `\0${virtualVoiceSamplePrefix}`

/**
 * Turns declarative voice-sample imports into cached audio assets generated through OpenRouter.
 *
 * Example:
 * import audio from 'voice-sample:greeting' with {text: 'Hello', voice: 'iris', format: 'opus'}
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
      const cacheDirOption = options.cacheDir ?? 'temp/vite-plugin-import-voice-sample/cache'
      const cacheDir = isAbsolute(cacheDirOption) ? cacheDirOption : resolve(config.root, cacheDirOption)
      cache = new VoiceSampleCache({
        apiKey: options.apiKey || env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY,
        cacheDir,
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
        return [
          {
            ...source,
            text: JSON.stringify(`${virtualVoiceSamplePrefix}${key}`),
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
      if (!source.startsWith(virtualVoiceSamplePrefix) && !source.startsWith(resolvedVirtualPrefix)) {
        return
      }
      const key = source.slice(source.startsWith(resolvedVirtualPrefix) ? resolvedVirtualPrefix.length : virtualVoiceSamplePrefix.length)
      const request = requests.get(key)
      if (!request) {
        this.error(`Unknown voice sample virtual module "${source}".`)
      }
      const file = await cache.get(request)
      this.addWatchFile(file)
      const assetId = `${normalizePath(file)}?url`
      const resolved = await this.resolve(assetId, importer, {skipSelf: true})
      return resolved?.id ?? assetId
    },
  }
}
