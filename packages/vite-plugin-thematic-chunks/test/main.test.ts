import {expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'

import fs from 'fs-extra'
import {build} from 'vite'

import thematicChunks, {thematicChunkGroups, thematicChunkPresets} from '../src/main.ts'

test('installs every preset in thematic priority order', () => {
  expect(thematicChunkGroups.map(group => group.name)).toEqual([
    'monaco',
    'rapier',
    'three',
    'react',
    'sub',
    'vendor',
    'main',
  ])
  expect(thematicChunks().apply).toBe('build')
})
test('monaco preset captures the editor packages from dependencies or workspaces', () => {
  const {test: matches} = thematicChunkPresets.monaco
  expect(matches.test('C:/app/node_modules/monaco-editor/esm/vs/editor/editor.api.js')).toBe(true)
  expect(matches.test(String.raw`C:\app\node_modules\@monaco-editor\react\dist\index.js`)).toBe(true)
  expect(matches.test('/repo/packages/monacozen/src/main.ts')).toBe(true)
  expect(matches.test('/repo/node_modules/react/index.js')).toBe(false)
})
test('owns the Rapier dynamic-entry filename without taking over consumer naming', () => {
  const plugin = thematicChunks()
  if (typeof plugin.outputOptions !== 'function') {
    throw new TypeError('Expected an outputOptions hook.')
  }
  const options = plugin.outputOptions.call({} as never, {
    chunkFileNames: (chunkInfo: {name: string}) => `consumer-${chunkInfo.name}.js`,
  } as never)
  if (!options || options instanceof Promise || typeof options.chunkFileNames !== 'function') {
    throw new TypeError('Expected synchronous chunk filename options.')
  }
  const chunkFileNames = options.chunkFileNames
  expect(chunkFileNames({
    name: 'rapier',
    isDynamicEntry: true,
  } as never)).toBe('rapier-entry.js')
  expect(chunkFileNames({
    name: 'rapier',
    isDynamicEntry: false,
  } as never)).toBe('consumer-rapier.js')
  expect(chunkFileNames({
    name: 'other',
    isDynamicEntry: true,
  } as never)).toBe('consumer-other.js')
})
test('build emits only groups that capture modules and monaco wins overlapping groups', async () => {
  const root = await fs.mkdtemp(resolve(tmpdir(), 'thematic-chunks-'))
  try {
    const modules = [
      'node_modules/monaco-editor/index.js',
      'node_modules/@monaco-editor/react/index.js',
      'packages/monacozen/index.js',
    ]
    for (const [index, module] of modules.entries()) {
      await fs.outputFile(resolve(root, module), `globalThis.__thematicChunkFixture = (globalThis.__thematicChunkFixture ?? 0) + ${index + 1}`)
    }
    await fs.outputFile(resolve(root, 'main.js'), `
      import './node_modules/monaco-editor/index.js'
      import './node_modules/@monaco-editor/react/index.js'
      import './packages/monacozen/index.js'
      console.log(globalThis.__thematicChunkFixture)
    `)
    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [thematicChunks()],
      build: {
        minify: false,
        write: false,
        rolldownOptions: {
          input: resolve(root, 'main.js'),
        },
      },
    })
    if (Array.isArray(result) || 'close' in result) {
      throw new TypeError('Expected one completed build output.')
    }
    const chunks = result.output.filter(output => output.type === 'chunk')
    const monaco = chunks.find(chunk => chunk.name === 'monaco')
    expect(monaco).toBeDefined()
    const monacoModules = Object.keys(monaco?.modules ?? {}).map(path => path.replaceAll('\\', '/'))
    for (const module of modules) {
      expect(monacoModules).toContain(resolve(root, module).replaceAll('\\', '/'))
    }
    expect(chunks.map(chunk => chunk.name)).not.toEqual(
      expect.arrayContaining(['rapier', 'three', 'react', 'sub', 'vendor']),
    )
  } finally {
    await fs.remove(root)
  }
})
