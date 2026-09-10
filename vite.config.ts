import type {AcceptedPlugin} from 'postcss'
import type {ConfigEnv, UserConfig, UserConfigFn} from 'vite'

import babelPlugin from '@rolldown/plugin-babel'
import reactPlugin, {reactCompilerPreset} from '@vitejs/plugin-react'
import postcssAutoprefixer from 'autoprefixer'
import cssnano from 'cssnano-preset-advanced'
import postcssNormalize from 'postcss-normalize'
import {loadEnv, mergeConfig} from 'vite'
import mediaMixinsPlugin from 'vite-plugin-media-mixins'
import titlePlugin from 'vite-plugin-title'

import {victoriaTelemetry} from '#src/lib/telemetry/vite.ts'

const getCommonConfig = (context: ConfigEnv) => {
  const env = loadEnv(context.mode, process.cwd(), 'SLOP_VICTORIA_')
  const config: UserConfig = {
    build: {
      target: 'chrome153',
      chunkSizeWarningLimit: 6000,
      sourcemap: true,
    },
    plugins: [
      titlePlugin(),
      reactPlugin(),
      babelPlugin({
        presets: [reactCompilerPreset()],
      }),
      mediaMixinsPlugin(),
      victoriaTelemetry({
        metrics: env.SLOP_VICTORIA_METRICS_URL,
        logs: env.SLOP_VICTORIA_LOGS_URL,
        traces: env.SLOP_VICTORIA_TRACES_URL,
      }),
    ],
    resolve: {
      // Rapier and other dependencies must share the app’s WebGPU-only Fiber implementation.
      alias: [
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
    server: {
      host: '0.0.0.0',
      allowedHosts: ['vite.tower.lan'],
    },
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
                name: 'react',
                test: /[/\\]node_modules[/\\]react(-dom)?[/\\]/u,
                priority: 2,
              },
              {
                name: 'vendor',
                test: /node_modules/u,
                priority: 1,
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
