# vite-plugin-game-level

Build one game level without bundling the alternate worlds. The plugin resolves a shared import prefix to the selected level directory, replaces a compile-time constant, copies only the configured public assets and rejects bundles containing other level directories.

```typescript
import {defineConfig, loadEnv} from 'vite'
import gameLevelPlugin, {selectGameLevel} from 'vite-plugin-game-level'

export default defineConfig(({mode}) => {
  const level = selectGameLevel(loadEnv(mode, process.cwd(), 'GAME_LEVEL').GAME_LEVEL, ['forest', 'ocean'], 'forest')
  return {
    plugins: [gameLevelPlugin({
      level,
      levels: {
        forest: {directory: 'src/levels/forest', publicAssets: ['forest']},
        ocean: {directory: 'src/levels/ocean', publicAssets: ['ocean']},
      },
      sharedPublicAssets: ['icon.svg'],
    })],
  }
})
```

Import `#level/Scene.tsx` from your shared World. Each level supplies the same interface, but only the selected directory is resolved. Provide a default `#level/*` package import mapping for TypeScript and direct Bun tests; Vite’s alias overrides it.

Options:
- `level`: the selected key in `levels`.
- `levels`: named directories relative to Vite’s root, with optional files or directories relative to its public directory.
- `alias`: import prefix, default `#level`.
- `define`: compile-time expression, default `import.meta.env.GAME_LEVEL`.
- `sharedPublicAssets`: files or directories to copy in every build.

Vite’s blanket public-directory copying is disabled. Only explicitly listed assets are copied; the dev server still serves the normal public directory. Each build writes `level-build.json` containing the selected level and project module paths. Level directories must be disjoint. Shared code belongs outside them.
