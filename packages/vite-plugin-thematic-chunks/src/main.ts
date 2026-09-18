import type {Plugin} from 'vite'

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

/** Applies the shared thematic chunking strategy to Vite's Rolldown build. */
export default function thematicChunks(): Plugin {
  return {
    name: 'thematic-chunks',
    apply: 'build',
    config() {
      return {
        build: {
          rolldownOptions: {
            output: {
              codeSplitting: {
                groups: [...thematicChunkGroups],
              },
            },
          },
        },
      }
    },
  }
}
