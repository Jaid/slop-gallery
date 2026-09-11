import type {AcceptedPlugin} from 'postcss'
import type {ConfigEnv, Plugin, UserConfig, UserConfigFn} from 'vite'

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
import {knotExhibition} from '#src/lib/knots/exhibition.ts'
import {victoriaTelemetry} from '#src/lib/telemetry/vite.ts'

const knotMaterialsModule = 'virtual:knot-exhibition-materials'
const resolvedKnotMaterialsModule = `\0${knotMaterialsModule}`
const knotMaterialsPlugin = (): Plugin => ({
  name: 'knot-exhibition-materials',
  resolveId(id) {
    if (id === knotMaterialsModule) {
      return resolvedKnotMaterialsModule
    }
  },
  load(id) {
    if (id !== resolvedKnotMaterialsModule) {
      return
    }
    const imports = knotExhibition.map((item, index) => `import Material${index} from ${JSON.stringify(`/src/lib/knots/${item.model}/items/${item.sourceId}/material.ts`)}`)
    const constructors = knotExhibition.map((_, index) => `Material${index}`)
    return `${imports.join('\n')}\nexport default [${constructors.join(', ')}]\n`
  },
})
const getCommonConfig = (context: ConfigEnv) => {
  const env = loadEnv(context.mode, process.cwd(), 'SLOP_VICTORIA_')
  const level = selectGameLevel(loadEnv(context.mode, process.cwd(), 'GAME_LEVEL').GAME_LEVEL, levelIds, defaultLevel)
  const config: UserConfig = {
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
        metrics: env.SLOP_VICTORIA_METRICS_URL,
        logs: env.SLOP_VICTORIA_LOGS_URL,
        traces: env.SLOP_VICTORIA_TRACES_URL,
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
