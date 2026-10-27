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
  /** the modules the entries import statically, known once the build ends */
  let eager: Set<string> | undefined
  return {
    name: 'thematic-chunks',
    buildEnd() {
      eager = new Set
      const pending = [...this.getModuleIds()].filter(id => this.getModuleInfo(id)?.isEntry)
      while (pending.length) {
        const id = pending.pop()!
        if (eager.has(id)) {
          continue
        }
        eager.add(id)
        pending.push(...this.getModuleInfo(id)?.importedIds ?? [])
      }
    },
    outputOptions(options) {
      const codeSplitting = typeof options.codeSplitting === 'object' ? options.codeSplitting : {}
      const chunkFileNames = options.chunkFileNames
      return {
        ...options,
        codeSplitting: options.codeSplitting !== false && {
          ...codeSplitting,
          // The main group only takes what the entries import statically, so app code behind a dynamic import still loads on demand.
          groups: [...codeSplitting.groups ?? [], ...thematicChunkGroups.map(group => (group.name === 'main' ? {
            ...group,
            test: (id: string) => eager?.has(id) ?? true,
          } : {...group}))],
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
