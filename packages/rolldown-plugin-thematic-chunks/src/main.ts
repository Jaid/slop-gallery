import type {CodeSplittingGroup, Plugin} from 'rolldown'

/** only takes modules the entries import statically, so that code behind a dynamic import keeps loading on demand in chunks of its own */
const initial = ['$initial'] satisfies CodeSplittingGroup['tags']
/** the name a dynamic entry of Rapier’s goes by in the consumer’s chunk file names */
const rapierEntryName = 'rapier-entry'

export const thematicChunkPresets = {
  monaco: {
    name: 'monaco',
    test: /[/\\](?:@monaco-editor[/\\]react|monaco-editor|monacozen)[/\\]/u,
    priority: 7,
  },
  rapier: {
    name: 'rapier',
    test: /[/\\]node_modules[/\\](?:@[^/\\]+[/\\])?rapier[^/\\]*[/\\]/u,
    priority: 6,
    includeDependenciesRecursively: false,
  },
  three: {
    name: 'three',
    test: /[/\\]node_modules[/\\]three[/\\]/u,
    priority: 5,
  },
  react: {
    name: 'react',
    test: /[/\\]node_modules[/\\]react(-dom)?[/\\]/u,
    priority: 4,
  },
  sub: {
    name: 'sub',
    test: /[/\\]packages[/\\]/u,
    priority: 2,
    tags: initial,
  },
  vendor: {
    name: 'vendor',
    test: /node_modules/u,
    priority: 3,
    tags: initial,
  },
  main: {
    name: 'main',
    tags: initial,
  },
} as const satisfies Record<string, CodeSplittingGroup>

export const thematicChunkGroups: ReadonlyArray<CodeSplittingGroup> = Object.values(thematicChunkPresets)

/** Applies the shared thematic chunking strategy without changing unrelated output options. */
export default function thematicChunks(): Plugin {
  return {
    name: 'thematic-chunks',
    outputOptions(options) {
      const codeSplitting = typeof options.codeSplitting === 'object' ? options.codeSplitting : {}
      const chunkFileNames = options.chunkFileNames
      return {
        ...options,
        codeSplitting: options.codeSplitting !== false && {
          ...codeSplitting,
          groups: [...codeSplitting.groups ?? [], ...thematicChunkGroups.map(group => ({...group}))],
        },
        ...chunkFileNames === undefined ? {} : {
          chunkFileNames: chunkInfo => {
            // A dynamic entry of Rapier’s would take the name of the rapier group’s chunk, so it goes by rapier-entry in the consumer’s pattern.
            const renamed = chunkInfo.name === 'rapier' && chunkInfo.isDynamicEntry
            if (typeof chunkFileNames === 'function') {
              return chunkFileNames(renamed ? {
                ...chunkInfo,
                name: rapierEntryName,
              } : chunkInfo)
            }
            return renamed ? chunkFileNames.replaceAll('[name]', () => rapierEntryName) : chunkFileNames
          },
        },
      }
    },
  }
}
