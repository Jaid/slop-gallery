import type {OutputOptions} from 'rolldown'

import {expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'

import fs from 'fs-extra'
import {build as rolldownBuild} from 'rolldown'
import {build as viteBuild} from 'vite'

import thematicChunks, {thematicChunkGroups, thematicChunkPresets} from '../src/main.ts'

const configureOutput = (input: OutputOptions = {}) => {
  const plugin = thematicChunks()
  if (typeof plugin.outputOptions !== 'function') {
    throw new TypeError('Expected an outputOptions hook.')
  }
  const output = plugin.outputOptions.call({} as never, input)
  if (!output || output instanceof Promise) {
    throw new TypeError('Expected synchronous output options.')
  }
  return output
}
test('installs every preset through native Rolldown hooks', () => {
  expect(thematicChunkGroups.map(group => group.name)).toEqual([
    'monaco',
    'rapier',
    'three',
    'react',
    'sub',
    'vendor',
    'main',
  ])
  const plugin = thematicChunks()
  expect(plugin).not.toHaveProperty('apply')
  expect(plugin).not.toHaveProperty('config')
  const output = configureOutput()
  expect(output.codeSplitting).toEqual({groups: thematicChunkGroups})
  expect(output.chunkFileNames).toBeUndefined()
})
test('retains consumer chunk groups and thresholds without mutating their options', () => {
  const custom = {
    name: 'custom',
    test: /special/u,
    priority: 10,
  }
  const input: OutputOptions = {
    format: 'es',
    codeSplitting: {
      minSize: 100,
      groups: [custom],
    },
    assetFileNames: '[name].[ext]',
  }
  const output = configureOutput(input)
  expect(output.codeSplitting).toEqual({
    minSize: 100,
    groups: [custom, ...thematicChunkGroups],
  })
  expect(input.codeSplitting).toEqual({
    minSize: 100,
    groups: [custom],
  })
  expect(output.assetFileNames).toBe('[name].[ext]')
  expect(output.format).toBe('es')
})
test('respects explicitly disabled code splitting', () => {
  expect(configureOutput({codeSplitting: false}).codeSplitting).toBe(false)
})
test('monaco preset captures the editor packages from dependencies or workspaces', () => {
  const {test: matches} = thematicChunkPresets.monaco
  expect(matches.test('C:/app/node_modules/monaco-editor/esm/vs/editor/editor.api.js')).toBe(true)
  expect(matches.test(String.raw`C:\app\node_modules\@monaco-editor\react\dist\index.js`)).toBe(true)
  expect(matches.test('/repo/packages/monacozen/src/main.ts')).toBe(true)
  expect(matches.test('/repo/node_modules/react/index.js')).toBe(false)
})
test('owns the Rapier dynamic-entry filename without taking over consumer naming', () => {
  const {chunkFileNames} = configureOutput({chunkFileNames: chunk => `consumer-${chunk.name}.js`})
  if (typeof chunkFileNames !== 'function') {
    throw new TypeError('Expected a chunk filename function.')
  }
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
test('preserves string filename patterns for other chunks', () => {
  const {chunkFileNames} = configureOutput({chunkFileNames: 'chunks/[name]-[hash].js'})
  if (typeof chunkFileNames !== 'function') {
    throw new TypeError('Expected a chunk filename function.')
  }
  expect(chunkFileNames({
    name: 'rapier',
    isDynamicEntry: true,
  } as never)).toBe('rapier-entry.js')
  expect(chunkFileNames({
    name: 'other',
    isDynamicEntry: true,
  } as never)).toBe('chunks/[name]-[hash].js')
})
for (const backend of ['Rolldown', 'Vite'] as const) {
  test(`${backend} emits only occupied groups and monaco wins overlapping groups`, async () => {
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
      const input = resolve(root, 'main.js')
      const plugins = [thematicChunks()]
      const result = backend === 'Rolldown' ? await rolldownBuild({
        input,
        preserveEntrySignatures: 'allow-extension',
        plugins,
        output: {format: 'es'},
        write: false,
      }) : await viteBuild({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins,
        build: {
          minify: false,
          write: false,
          rolldownOptions: {input},
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
      for (const emptyGroup of ['rapier', 'three', 'react', 'sub', 'vendor']) {
        expect(chunks.map(chunk => chunk.name)).not.toContain(emptyGroup)
      }
    } finally {
      await fs.remove(root)
    }
  })
}
