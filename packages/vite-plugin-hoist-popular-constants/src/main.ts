import type {HoistPopularConstantsOptions} from 'babel-plugin-hoist-popular-constants'
import type {Plugin} from 'vite'

import {transformAsync} from '@babel/core'
import hoistPopularConstants from 'babel-plugin-hoist-popular-constants'

export type VitePluginHoistPopularConstantsOptions = HoistPopularConstantsOptions

/** Pools profitable primitive constants after chunk rendering, before final minification. */
export default function vitePluginHoistPopularConstants(options: VitePluginHoistPopularConstantsOptions = {}): Plugin {
  const stableBuiltins = options.stableBuiltins ?? true
  const babelOptions: HoistPopularConstantsOptions = {
    ...options,
    estimateMinifiedSize: options.estimateMinifiedSize ?? true,
    join: stableBuiltins && (options.join ?? true),
    minimumSavingsBytes: options.minimumSavingsBytes ?? 0,
    stableBuiltins,
  }
  return {
    name: 'hoist-popular-constants',
    apply: 'build',
    enforce: 'post',
    renderChunk: {
      order: 'post',
      async handler(code, chunk, outputOptions) {
        if (outputOptions.format !== 'es') {
          return null
        }
        const result = await transformAsync(code, {
          babelrc: false,
          comments: true,
          compact: true,
          configFile: false,
          filename: chunk.fileName,
          minified: true,
          parserOpts: {
            allowAwaitOutsideFunction: true,
            sourceType: 'module',
          },
          plugins: [[hoistPopularConstants, babelOptions]],
          sourceMaps: Boolean(outputOptions.sourcemap),
        })
        if (!result?.code || !result.metadata.hoistPopularConstants) {
          return null
        }
        return {
          code: result.code,
          map: result.map ? JSON.stringify(result.map) : undefined,
        }
      },
    },
  }
}
