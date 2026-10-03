import type {Plugin} from 'rolldown'

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
  },
  vendor: {
    name: 'vendor',
    test: /node_modules/u,
    priority: 3,
  },
  main: {
    name: 'main',
  },
} as const

export const thematicChunkGroups = Object.values(thematicChunkPresets)

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
            if (chunkInfo.name === 'rapier' && chunkInfo.isDynamicEntry) {
              return 'rapier-entry.js'
            }
            if (typeof chunkFileNames === 'function') {
              return chunkFileNames(chunkInfo)
            }
            return chunkFileNames
          },
        },
      }
    },
  }
}
