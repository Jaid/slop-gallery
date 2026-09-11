import {preprocessCSS, resolveConfig} from 'vite'

// Direct Bun tests use the gallery entry points from package.json, regardless of the dev level.
Bun.env.GAME_LEVEL = 'gallery'
// Compile real modules for renderer-free component tests instead of mocking class names.
const config = resolveConfig({
  configLoader: 'runner',
  logLevel: 'silent',
}, 'serve')
await Bun.plugin({
  name: 'sass-modules-test-loader',
  setup(build) {
    build.onLoad({filter: /\.module\.sass$/u}, async ({path}) => {
      const {modules} = await preprocessCSS(await Bun.file(path).text(), path, await config)
      return {
        contents: `export default ${JSON.stringify(modules)}`,
        loader: 'js',
      }
    })
  },
})
