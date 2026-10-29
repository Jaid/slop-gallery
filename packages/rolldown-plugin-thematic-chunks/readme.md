# rolldown-plugin-thematic-chunks

Apply shared Monaco, Rapier, Three.js, React, workspace, vendor and main chunk groups with Rolldown.

## Rolldown

```typescript
import {defineConfig} from 'rolldown'
import thematicChunks from 'rolldown-plugin-thematic-chunks'

export default defineConfig({
  input: 'src/main.ts',
  preserveEntrySignatures: 'allow-extension',
  plugins: [thematicChunks()],
  output: {
    dir: 'dist',
    format: 'es',
    chunkFileNames: '[name].js',
  },
})
```

The Rapier preset uses `includeDependenciesRecursively: false`, which requires `preserveEntrySignatures: false` or `'allow-extension'`. The plugin does not override that input setting.

The main, workspace and vendor groups only take the modules the entries import statically, through Rolldown’s built-in `$initial` tag. Modules only a dynamic import reaches stay out of them, so they keep loading on demand in chunks of their own, like a whole world of a game or one material of a catalog; dependencies matched by the Monaco, Rapier, Three.js or React preset still join that preset’s chunk.

Existing chunk groups and code-splitting thresholds are retained. Explicit `codeSplitting: false` is respected. When a consumer supplies `chunkFileNames`, only a dynamic entry named `rapier` is renamed to `rapier-entry.js`; other chunks retain the consumer’s naming rule.

## Vite

The same plugin can be used in Vite’s top-level `plugins` array:

```typescript
import {defineConfig} from 'vite'
import thematicChunks from 'rolldown-plugin-thematic-chunks'

export default defineConfig({
  plugins: [thematicChunks()],
  build: {
    rolldownOptions: {
      preserveEntrySignatures: false,
    },
  },
})
```

The package also exports `thematicChunkPresets` and `thematicChunkGroups` for direct configuration.
