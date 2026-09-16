import type {BoxGeometry} from 'three/webgpu'

import {expect, test} from 'bun:test'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'

import {build} from 'vite'

import bakeGeometry from '../src/main.ts'

test('Vite specializes class definitions, preserves subclassing, and removes dead artifacts', async () => {
  const directory = await mkdtemp(join(import.meta.dirname, 'build-'))
  const originalFetch = globalThis.fetch
  try {
    await writeFile(join(directory, 'shape.ts'), `
      import {BoxGeometry, SphereGeometry} from 'three/webgpu'
      function buildContour() { return new BoxGeometry(2, 3, 4, 4, 4, 4).translate(5, 6, 7) }
      export class Sculpture {
        geometry = buildContour()
        constructor() { this.geometry.computeBoundingBox() }
        dispose() { this.geometry.dispose() }
      }
      export function unusedResource() { return new SphereGeometry(91, 80, 64) }
    `)
    await writeFile(join(directory, 'entry.ts'), `
      import {Sculpture} from './shape.ts'
      export {Sculpture}
      export class Child extends Sculpture { child = 7 }
    `)
    const result = await build({
      configFile: false,
      root: directory,
      base: '/nested/',
      logLevel: 'silent',
      plugins: [bakeGeometry({minimumBytes: 0})],
      build: {
        write: false,
        minify: false,
        target: 'esnext',
        sourcemap: true,
        rolldownOptions: {
          preserveEntrySignatures: 'strict',
          input: join(directory, 'entry.ts'),
          external: ['three/webgpu'],
        },
      },
    })
    if (Array.isArray(result) || !('output' in result)) {
      throw new Error('Unexpected Vite output')
    }
    const assets = result.output.filter(item => item.type === 'asset' && item.fileName.endsWith('.bin'))
    expect(assets).toHaveLength(1)
    const chunks = result.output.filter(item => item.type === 'chunk')
    expect(chunks).toHaveLength(1)
    const code = chunks[0].code
    expect(code).toContain('new.target')
    expect(code).not.toContain('buildContour')
    expect(code).not.toContain('unusedResource')
    expect(code).not.toContain('@babel')
    expect(code).not.toContain('node:')
    const fetches: Array<string> = []
    globalThis.fetch = (async input => {
      const url = input instanceof Request ? input.url : String(input)
      fetches.push(String(url))
      const file = assets.find(item => String(url).endsWith(item.fileName))
      if (!file || file.type !== 'asset') {
        throw new Error(`Unexpected resource URL: ${url}`)
      }
      return new Response(file.source as Uint8Array<ArrayBuffer>)
    }) as typeof fetch
    const file = join(directory, 'output.mjs')
    await writeFile(file, code)
    type Sculpture = {geometry: BoxGeometry, dispose: () => void}
    const module = await import(pathToFileURL(file).href) as {Sculpture: new () => Sculpture, Child: new () => Sculpture & {child: number}}
    const first = new module.Sculpture
    const second = new module.Sculpture
    const child = new module.Child
    expect(first).toBeInstanceOf(module.Sculpture)
    expect(child).toBeInstanceOf(module.Sculpture)
    expect(child).toBeInstanceOf(module.Child)
    expect(child.child).toBe(7)
    expect(first.geometry.boundingBox!.min.x).toBe(4)
    expect(first.geometry).not.toBe(second.geometry)
    expect(first.geometry.attributes.position.array.buffer).not.toBe(second.geometry.attributes.position.array.buffer)
    let disposed = false
    first.geometry.addEventListener('dispose', () => {
      disposed = true
    })
    first.dispose()
    expect(disposed).toBe(true)
    expect(fetches).toHaveLength(1)
  } finally {
    globalThis.fetch = originalFetch
    await rm(directory, {
      recursive: true,
      force: true,
    })
  }
})
test('leaves runtime arguments in place and preserves argument side effects on specialized classes', async () => {
  const directory = await mkdtemp(join(import.meta.dirname, 'dynamic-'))
  try {
    await writeFile(join(directory, 'entry.ts'), `
      import {BoxGeometry} from 'three/webgpu'
      export class Static { constructor() { this.geometry = new BoxGeometry(1, 2, 3) } }
      let calls = 0
      export function dynamic(width) { return new BoxGeometry(width, 2, 3) }
      export function withEffect() { return new Static(++calls) }
      export function count() { return calls }
    `)
    const result = await build({
      configFile: false,
      root: directory,
      logLevel: 'silent',
      plugins: [bakeGeometry({minimumBytes: 0})],
      build: {
        write: false,
        minify: false,
        target: 'esnext',
        rolldownOptions: {
          preserveEntrySignatures: 'strict',
          input: join(directory, 'entry.ts'),
          external: ['three/webgpu'],
        },
      },
    })
    if (Array.isArray(result) || !('output' in result)) {
      throw new Error('Unexpected Vite output')
    }
    const code = result.output.filter(item => item.type === 'chunk').map(item => item.code).join('\n')
    expect(code).toContain('new BoxGeometry(width')
    expect(code).toContain('++calls')
    expect(code).toContain('new Static(')
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    })
  }
})
