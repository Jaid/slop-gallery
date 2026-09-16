import type {DataTexture} from 'three/webgpu'

import {expect, test} from 'bun:test'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'

import {build} from 'vite'

import bakeTextures from '../src/main.ts'

test('Vite removes the pixel generator while retaining dynamic sampling and fresh texture ownership', async () => {
  const directory = await mkdtemp(join(import.meta.dirname, 'build-'))
  const originalFetch = globalThis.fetch
  try {
    await writeFile(join(directory, 'entry.ts'), `
      import {DataTexture, RepeatWrapping} from 'three/webgpu'
      export class Pixels {
        constructor() {
          const data = new Uint8Array(32 * 16 * 4)
          for (let i = 0; i < data.length; i++) data[i] = i % 251
          this.map = new DataTexture(data, 32, 16)
        }
        dispose() { this.map.dispose() }
      }
      export function tiled(width, height) {
        const result = new Pixels
        result.map.wrapS = RepeatWrapping
        result.map.repeat.set(width, height)
        return result
      }
    `)
    const result = await build({
      configFile: false,
      root: directory,
      logLevel: 'silent',
      plugins: [bakeTextures({minimumBytes: 0})],
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
    const assets = result.output.filter(item => item.type === 'asset' && item.fileName.endsWith('.bin'))
    const chunks = result.output.filter(item => item.type === 'chunk')
    expect(assets).toHaveLength(1)
    expect(chunks).toHaveLength(1)
    const code = chunks[0].code
    expect(code).not.toContain('% 251')
    expect(code).not.toContain('@napi-rs')
    expect(code).not.toContain('node:')
    expect(code).toContain('repeat.set(width, height)')
    globalThis.fetch = (async input => {
      const url = input instanceof Request ? input.url : String(input)
      const file = assets.find(item => url.endsWith(item.fileName))
      if (file?.type !== 'asset') {
        throw new Error(`Unexpected baked resource: ${url}`)
      }
      return new Response(file.source as Uint8Array<ArrayBuffer>)
    }) as typeof fetch
    const file = join(directory, 'output.mjs')
    await writeFile(file, code)
    type Pixels = {
      dispose: () => void
      map: DataTexture
    }
    const module = await import(pathToFileURL(file).href) as {tiled: (width: number, height: number) => Pixels}
    const first = module.tiled(3, 4)
    const second = module.tiled(7, 8)
    expect(first.map.repeat.toArray()).toEqual([3, 4])
    expect(second.map.repeat.toArray()).toEqual([7, 8])
    const expected = Uint8Array.from({length: 32 * 16 * 4}, (_, index) => index % 251)
    expect(first.map.image.data).toEqual(expected)
    expect(second.map.image.data).toEqual(expected)
    expect(first.map.source).not.toBe(second.map.source)
    expect(first.map.uuid).not.toBe(second.map.uuid)
    let disposed = false
    first.map.addEventListener('dispose', () => {
      disposed = true
    })
    first.dispose()
    expect(disposed).toBe(true)
  } finally {
    globalThis.fetch = originalFetch
    await rm(directory, {
      recursive: true,
      force: true,
    })
  }
})
