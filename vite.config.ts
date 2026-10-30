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
import {mergeConfig} from 'vite'
import bakeThreePlugin from 'vite-plugin-bake-three'
import browserslistTargetPlugin from 'vite-plugin-browserslist-target'
import importVoiceSamplePlugin from 'vite-plugin-import-voice-sample'
import jxlHeadersPlugin from 'vite-plugin-jxl-headers'
import mediaMixinsPlugin from 'vite-plugin-media-mixins'
import titlePlugin from 'vite-plugin-title'

import loadingScreenPlugin from '#src/lib/vite/loadingScreenPlugin.ts'
import rapierWasmPlugin from '#src/lib/vite/rapierWasmPlugin.ts'
import worldChunksPlugin from '#src/lib/vite/worldChunksPlugin.ts'
import {defaultWorld, knottinghamParameters, selectWorld, worldIds, worlds} from '#src/worlds/index.ts'

const getCommonConfig = () => {
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
      titlePlugin(worlds[defaultWorld].title),
      loadingScreenPlugin({
        worlds,
        defaultWorld,
        select: selectWorld,
        selectorArguments: [knottinghamParameters],
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
  const worldChunks = worldChunksPlugin(Object.fromEntries(worldIds.map(id => [id, `src/worlds/${id}/index.ts`])))
  const config: UserConfig = {
    plugins: [
      jxlHeadersPlugin(),
      rapierWasmPlugin(),
      // Only recipes that take longer to generate than their snapshots take to download; the rest load sooner without them.
      bakeThreePlugin({
        geometry: {
          include: [
            'src/components/Architecture/index.tsx',
            'src/lib/gallery/OculusGroundGeometry.ts',
            'src/lib/gallery/moonfall/CraterGeometry.ts',
            // The lattice is quicker to build than to download.
            {
              glob: 'src/lib/gallery/antechamberDome.ts',
              scope: 'antechamberDomeGeometry',
            },
          ],
        },
        staticTextures: {
          include: [
            'packages/knot-materials/src/entries/{great_cat_emergence,felidae_nocturne}/Material.ts',
            'packages/knot-materials/src/candidates/{claude_haiku/lib/knotArcLength,deepseek/lib/interference}.ts',
          ],
        },
        // No region of the worlds is closed and static enough for it.
        staticRendering: false,
      }),
      bakeBranchComponentPlugin(),
      {
        ...hoistPopularConstantsPlugin(),
        apply: 'build',
        enforce: 'post',
      },
      worldChunks,
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
          codeSplitting: {
            groups: [
              ...worldChunks.groups,
              {
                // The Knots’ metadata, which every material reads its own entry from, in one chunk instead of one per entry; it only loads with the first Knot.
                name: 'knot-catalog',
                test: /[/\\]knot-materials[/\\]src[/\\](?:(?:candidates|entries)[/\\](?:[^/\\]+[/\\]data|index)\.ts$|main\.ts$|rarities\.ts$|KnotCandidate\.ts$)/u,
                priority: 9,
                // Only the metadata itself, not what it imports, which other chunks share.
                includeDependenciesRecursively: false,
              },
              {
                // The helpers the Knots’ shaders share, the package’s and each candidate’s, loaded once with the first material that needs them, with what only they need, like the textures baked for them.
                // Below the chunks of packages and libraries, which keep what the page shares with them.
                name: 'knot-shaders',
                test: /[/\\]knot-materials[/\\]src[/\\](?:candidates[/\\][^/\\]+[/\\])?lib[/\\]/u,
                priority: 1,
              },
            ],
          },
          chunkFileNames: chunkInfo => {
            if (chunkInfo.name === 'rolldown-runtime') {
              return 'runtime.js'
            }
            // Every Knot material loads on its own once a Knot wears it, as a chunk named after its entry.
            const knot = chunkInfo.facadeModuleId ? /[/\\]knot-materials[/\\]src[/\\]entries[/\\]([^/\\]+)[/\\]Material\.ts$/u.exec(chunkInfo.facadeModuleId)?.[1] : undefined
            if (knot) {
              return `knot-${knot}.js`
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
const config: UserConfigFn = context => mergeConfig(getCommonConfig(), (context.mode === 'production' ? getProductionConfig : getDevelopmentConfig)(context))

export default config
