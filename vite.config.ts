import type {AcceptedPlugin} from 'postcss'
import type {ConfigEnv, UserConfig, UserConfigFn} from 'vite'

import babelPlugin from '@rolldown/plugin-babel'
import reactPlugin, {reactCompilerPreset} from '@vitejs/plugin-react'
import postcssAutoprefixer from 'autoprefixer'
import cssnano from 'cssnano-preset-advanced'
import postcssNormalize from 'postcss-normalize'
import {loadEnv, mergeConfig} from 'vite'
import avifOnly from 'vite-plugin-avif-only'
import gameLevelPlugin, {selectGameLevel} from 'vite-plugin-game-level'
import mediaMixinsPlugin from 'vite-plugin-media-mixins'
import titlePlugin from 'vite-plugin-title'

import levels, {defaultLevel, levelIds} from '#src/data/levels.ts'
import {victoriaTelemetry} from '#src/lib/telemetry/vite.ts'
import knotMaterialsPlugin from '#src/lib/vite/knotMaterialsPlugin.ts'

const getCommonConfig = (context: ConfigEnv) => {
  const env = loadEnv(context.mode, process.cwd(), 'TELEMETRY_INGESTION_')
  const level = selectGameLevel(loadEnv(context.mode, process.cwd(), 'GAME_LEVEL').GAME_LEVEL, levelIds, defaultLevel)
  const config: UserConfig = {
    // Only the public relay prefix enters the client bundle, never private ingestion destinations.
    define: {
      'import.meta.env.TELEMETRY_INGESTION_RELAY_ENDPOINT': JSON.stringify(env.TELEMETRY_INGESTION_RELAY_ENDPOINT ?? ''),
    },
    build: {
      target: 'chrome153',
      chunkSizeWarningLimit: 10_000,
      sourcemap: true,
    },
    plugins: [
      knotMaterialsPlugin(),
      titlePlugin(levels[level].title),
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
      victoriaTelemetry({
        metrics: env.TELEMETRY_INGESTION_METRICS_ENDPOINT,
        logs: env.TELEMETRY_INGESTION_LOGS_ENDPOINT,
        traces: env.TELEMETRY_INGESTION_TRACES_ENDPOINT,
      }),
    ],
    resolve: {
      alias: [
       // Rapier and other dependencies must share the app’s WebGPU-only Fiber implementation.
        {
          find: /^@react-three\/fiber$/u,
          replacement: '@react-three/fiber/webgpu',
        },
      ],
    },
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
    plugins: [avifOnly()],
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
            if (chunkInfo.name === 'rapier' && chunkInfo.isDynamicEntry) {
              return 'rapier-entry.js'
            }
            if (chunkInfo.name === 'rolldown-runtime') {
              return 'runtime.js'
            }
            return '[name].js'
          },
          assetFileNames: chunkInfo => {
            if (['index.css', 'main.css'].includes(chunkInfo.names[0] ?? '')) {
              return 'style.css'
            }
            return '[name].[ext]'
          },
          codeSplitting: {
            groups: [
              {
                name: 'rapier',
                test: /[/\\]node_modules[/\\](?:@[^/\\]+[/\\])?rapier[^/\\]*[/\\]/u,
                priority: 6,
                includeDependenciesRecursively: false,
              },
              {
                name: 'three',
                test: /[/\\]node_modules[/\\]three[/\\]/u,
                priority: 5,
              },
              {
                name: 'react',
                test: /[/\\]node_modules[/\\]react(-dom)?[/\\]/u,
                priority: 4,
              },
              {
                name: 'sub',
                test: /[/\\]packages[/\\]/u,
                priority: 2,
              },
              {
                name: 'vendor',
                test: /node_modules/u,
                priority: 3,
              },
              {
                name: 'main',
              },
            ],
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
