# rolldown-plugin-hoist-popular-constants

Pool profitable primitive constants in rendered ESM chunks before final minification. The Babel implementation and its options remain available in `babel-plugin-hoist-popular-constants`.

## Rolldown

```typescript
import {defineConfig} from 'rolldown'
import hoistPopularConstants from 'rolldown-plugin-hoist-popular-constants'

export default defineConfig({
  input: 'src/main.ts',
  plugins: [hoistPopularConstants()],
  output: {dir: 'dist', format: 'es'},
})
```

The plugin uses normal `renderChunk` hook ordering. Place it after other chunk transforms and before the final minifier. A custom minifier can use `order: 'post'` to run later. Source maps are preserved when enabled. Non-ESM output is left untouched.

## Vite

Register the plugin in Vite’s top-level `plugins` array with Vite-specific post placement for late user-plugin placement before final minification:

```typescript
import {defineConfig} from 'vite'
import hoistPopularConstants from 'rolldown-plugin-hoist-popular-constants'

export default defineConfig({
  plugins: [{
    ...hoistPopularConstants(),
    apply: 'build',
    enforce: 'post',
  }],
})
```

The Vite-specific flags belong to the consumer, not the Rolldown plugin. Keep the render hook at normal priority: forcing `renderChunk.order: 'post'` would move it after Vite’s normal-priority Terser hook, regardless of plugin placement. The integration test covers the actual Vite minifier ordering.

## Options

Import `RolldownPluginHoistPopularConstantsOptions` for the public options type. The adapter defaults to `estimateMinifiedSize: true`, `minimumSavingsBytes: 0`, `stableBuiltins: true` and string joining when stable built-ins are enabled. Set `stableBuiltins: false` when the runtime may modify built-ins.
