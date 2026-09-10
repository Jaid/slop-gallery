import {expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'

import fs from 'fs-extra'
import {build} from 'vite'

import gameLevelPlugin, {selectGameLevel} from '../src/main.ts'

test('validates selection without knowing anything about a particular game', () => {
  expect(selectGameLevel(undefined, ['forest', 'ocean'], 'forest')).toBe('forest')
  expect(selectGameLevel('ocean', ['forest', 'ocean'], 'forest')).toBe('ocean')
  expect(() => selectGameLevel('space', ['forest', 'ocean'], 'forest')).toThrow('Invalid game level')
  expect(() => gameLevelPlugin({
    level: 'missing',
    levels: {forest: {directory: 'forest'}},
  })).toThrow('Invalid game level')
})
test('builds only the selected entry graph, constant and public assets, and detects leaks', async () => {
  const root = await fs.mkdtemp(resolve(tmpdir(), 'game-level-'))
  try {
    await fs.outputFile(resolve(root, 'main.js'), "import value from '#level/main.js'; console.log(value, import.meta.env.GAME_LEVEL)")
    for (const level of ['forest', 'ocean']) {
      await fs.outputFile(resolve(root, level, 'main.js'), `export default '${level}-only'`)
      await fs.outputFile(resolve(root, 'public', level, 'preview.txt'), level)
    }
    await fs.outputFile(resolve(root, 'public/shared.txt'), 'shared')
    for (const level of ['forest', 'ocean']) {
      await build({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [
          gameLevelPlugin({
            level,
            levels: {
              forest: {
                directory: 'forest',
                publicAssets: ['forest'],
              },
              ocean: {
                directory: 'ocean',
                publicAssets: ['ocean'],
              },
            },
            sharedPublicAssets: ['shared.txt'],
          }),
        ],
        build: {
          outDir: 'dist',
          minify: false,
          rolldownOptions: {input: resolve(root, 'main.js')},
        },
      })
      const other = level === 'forest' ? 'ocean' : 'forest'
      const manifest = await fs.readJson(resolve(root, 'dist/level-build.json')) as {level: string
        modules: Array<string>}
      expect(manifest.level).toBe(level)
      expect(manifest.modules).toContain(`${level}/main.js`)
      expect(manifest.modules).not.toContain(`${other}/main.js`)
      expect(await fs.pathExists(resolve(root, 'dist', level, 'preview.txt'))).toBe(true)
      expect(await fs.pathExists(resolve(root, 'dist', other))).toBe(false)
      expect(await fs.pathExists(resolve(root, 'dist/shared.txt'))).toBe(true)
      const files = await Array.fromAsync(new Bun.Glob('**/*.js').scan(resolve(root, 'dist')))
      const code = (await Promise.all(files.map(file => Bun.file(resolve(root, 'dist', file)).text()))).join('\n')
      expect(code).toContain(`${level}-only`)
      expect(code).not.toContain(`${other}-only`)
      expect(code).not.toContain('import.meta.env')
    }
    await fs.outputFile(resolve(root, 'main.js'), "import value from './ocean/main.js'; console.log(value)")
    await expect(build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [
        gameLevelPlugin({
          level: 'forest',
          levels: {
            forest: {directory: 'forest'},
            ocean: {directory: 'ocean'},
          },
        }),
      ],
      build: {
        outDir: 'dist',
        rolldownOptions: {input: resolve(root, 'main.js')},
      },
    })).rejects.toThrow('Opposite level leaked')
  } finally {
    await fs.remove(root)
  }
})
