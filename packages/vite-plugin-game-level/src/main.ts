import type {Plugin} from 'vite'

import {resolve} from 'node:path'

import fs from 'fs-extra'

export type GameLevel = {
  directory: string
  publicAssets?: ReadonlyArray<string>
}
export type GameLevelOptions = {
  alias?: string
  define?: string
  level: string
  levels: Readonly<Record<string, GameLevel>>
  sharedPublicAssets?: ReadonlyArray<string>
}

export function selectGameLevel<Level extends string>(value: string | undefined, levels: ReadonlyArray<Level>, defaultLevel: Level): Level {
  const selected = value ?? defaultLevel
  const level = levels.find(candidate => candidate === selected)
  if (level === undefined) {
    throw new Error(`Invalid game level “${selected}”. Expected ${levels.join(' or ')}.`)
  }
  return level
}

/** Select one entry graph before bundling, with matching static assets and a build manifest. */
export default function gameLevelPlugin(options: GameLevelOptions): Plugin {
  const level = selectGameLevel(options.level, Object.keys(options.levels), options.level)
  const definition = options.levels[level]
  let root: string
  let outDir: string
  let publicDir: string
  return {
    name: 'game-level',
    config(config) {
      const projectRoot = resolve(config.root ?? '.')
      return {
        define: {[options.define ?? 'import.meta.env.GAME_LEVEL']: JSON.stringify(level)},
        resolve: {
          alias: [
            {
              find: options.alias ?? '#level',
              replacement: resolve(projectRoot, definition.directory),
            },
          ],
        },
        build: {copyPublicDir: false},
      }
    },
    configResolved(config) {
      root = config.root
      publicDir = config.publicDir
      outDir = resolve(root, config.build.outDir)
    },
    generateBundle(_options, bundle) {
      const modules = Object.values(bundle).flatMap(output => {
        if (output.type !== 'chunk') {
          return []
        }
        return Object.keys(output.modules).map(id => id.replaceAll('\\', '/'))
      })
      const excluded = Object.entries(options.levels).filter(([name]) => name !== level).map(([, entry]) => `${resolve(root, entry.directory).replaceAll('\\', '/')}/`)
      const forbidden = modules.filter(id => excluded.some(directory => id.startsWith(directory)))
      if (forbidden.length) {
        this.error(`Opposite level leaked into ${level}: ${forbidden.join(', ')}`)
      }
      const prefix = `${root.replaceAll('\\', '/')}/`
      this.emitFile({
        type: 'asset',
        fileName: 'level-build.json',
        source: JSON.stringify({
          level,
          modules: modules.filter(id => id.startsWith(prefix) && !id.includes('/node_modules/')).map(id => id.slice(prefix.length)).toSorted(),
        }, null, 2),
      })
    },
    async writeBundle() {
      // Public files bypass tree-shaking, so copy only the selected level’s assets.
      const assets = [...options.sharedPublicAssets ?? [], ...definition.publicAssets ?? []]
      if (!publicDir && assets.length) {
        this.error('Level assets require a public directory.')
      }
      await fs.ensureDir(outDir)
      for (const asset of assets) {
        await fs.copy(resolve(publicDir, asset), resolve(outDir, asset))
      }
    },
  }
}
