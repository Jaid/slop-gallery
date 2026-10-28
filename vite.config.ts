import type {AcceptedPlugin} from 'postcss'
import type {ConfigEnv, UserConfig, UserConfigFn} from 'vite'

import babelPlugin from '@rolldown/plugin-babel'
import reactPlugin, {reactCompilerPreset} from '@vitejs/plugin-react'
import postcssAutoprefixer from 'autoprefixer'
import cssnano from 'cssnano-preset-advanced'
import postcssNormalize from 'postcss-normalize'
import bakeBranchComponentPlugin from 'rolldown-plugin-bake-branch-component'
import hoistPopularConstantsPlugin from 'rolldown-plugin-hoist-popular-constants'
import thematicChunksPlugin from 'rolldown-plugin-thematic-chunks'
import {loadEnv, mergeConfig} from 'vite'
import bakeThreePlugin from 'vite-plugin-bake-three'
import browserslistTargetPlugin from 'vite-plugin-browserslist-target'
import gameLevelPlugin, {selectGameLevel} from 'vite-plugin-game-level'
import importVoiceSamplePlugin from 'vite-plugin-import-voice-sample'
import jxlHeadersPlugin from 'vite-plugin-jxl-headers'
import mediaMixinsPlugin from 'vite-plugin-media-mixins'
import titlePlugin from 'vite-plugin-title'

import levels, {defaultLevel, levelIds} from '#src/data/levels.ts'
import knotMaterialsPlugin from '#src/lib/vite/knotMaterialsPlugin.ts'
import loadingScreenPlugin from '#src/lib/vite/loadingScreenPlugin.ts'
import rapierWasmPlugin from '#src/lib/vite/rapierWasmPlugin.ts'

const getCommonConfig = (context: ConfigEnv) => {
  const level = selectGameLevel(loadEnv(context.mode, process.cwd(), 'GAME_LEVEL').GAME_LEVEL, levelIds, defaultLevel)
  const config: UserConfig = {
    build: {
      chunkSizeWarningLimit: 5000,
      assetsInlineLimit: 128,
    },
    plugins: [
      browserslistTargetPlugin(),
      importVoiceSamplePlugin({
        // Builds without OpenRouter access get silence for uncached samples instead of failing.
        optional: true,
      }),
      knotMaterialsPlugin(),
      titlePlugin(levels[level].title),
      loadingScreenPlugin(levels[level]),
      gameLevelPlugin({
        level,
        levels,
        sharedPublicAssets: ['icon.svg'],
      }),
      reactPlugin(),
      babelPlugin({
        presets: [reactCompilerPreset()],
      }),
      mediaMixinsPlugin(),
    ],
    css: {
      postcss: {
        plugins: [
          postcssNormalize() as unknown as AcceptedPlugin,
          postcssAutoprefixer,
        ],
      },
    },
  }
  return config
}
const getDevelopmentConfig = (context: ConfigEnv) => {
  const config: UserConfig = {
    build: {
      outDir: `out/build/${context.mode}`,
      sourcemap: true,
    },
  }
  return config
}
const getProductionConfig = () => {
  // Fonts, animation names and stacking levels can also be referenced from JavaScript.
  const cssnanoPlugins = cssnano({
    discardUnused: false,
    reduceIdents: false,
    mergeIdents: false,
    zindex: false,
  }).plugins.filter(([, options]) => !(options && 'exclude' in options && options.exclude)).map(([createPlugin, options]) => createPlugin(options))
  const config: UserConfig = {
    plugins: [
      jxlHeadersPlugin(),
      rapierWasmPlugin(),
      bakeThreePlugin(),
      bakeBranchComponentPlugin(),
      {
        ...hoistPopularConstantsPlugin(),
        apply: 'build',
        enforce: 'post',
      },
      thematicChunksPlugin(),
    ],
    build: {
      outDir: 'dist',
      assetsDir: '',
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2_000_000,
      minify: 'terser',
      rolldownOptions: {
        preserveEntrySignatures: false,
        treeshake: {
          // Three.js uses getters with observable behavior.
          propertyReadSideEffects: 'always',
        },
        optimization: {
          inlineConst: {
            mode: 'all',
            pass: 100,
          },
        },
        output: {
          minify: true,
          topLevelVar: true,
          chunkFileNames: chunkInfo => {
            if (chunkInfo.name === 'rolldown-runtime') {
              return 'runtime.js'
            }
            // Components live in folders of their name, so a chunk that starts at a component’s index takes the folder’s name.
            const folder = chunkInfo.name === 'index' && chunkInfo.facadeModuleId ? /([^/\\]+)[/\\]index\.tsx?$/u.exec(chunkInfo.facadeModuleId)?.[1] : undefined
            return `${folder ?? '[name]'}.js`
          },
          assetFileNames: chunkInfo => {
            if (['index.css', 'main.css'].includes(chunkInfo.names[0] ?? '')) {
              return 'style.css'
            }
            return '[name].[ext]'
          },
        },
        checks: {
          pluginTimings: false,
        },
      },
    },
    css: {
      postcss: {
        plugins: cssnanoPlugins,
      },
    },
  }
  return config
}
const config: UserConfigFn = context => mergeConfig(getCommonConfig(context), (context.mode === 'production' ? getProductionConfig : getDevelopmentConfig)(context))

export default config
