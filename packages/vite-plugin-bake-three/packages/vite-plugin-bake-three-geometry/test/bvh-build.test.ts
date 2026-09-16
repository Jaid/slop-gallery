import type {MeshBVH} from 'three-mesh-bvh'
import type {BufferGeometry} from 'three/webgpu'

import {expect, test} from 'bun:test'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'

import {build} from 'vite'

import bakeThreeGeometry from '../src/main.ts'

const source = `
  import {TorusKnotGeometry} from 'three/webgpu'
  import {MeshBVH as Tree} from 'three-mesh-bvh'
  function geometry() { return new TorusKnotGeometry(0.45, 0.13, 48, 16) }
  export class Resources {
    geometries = new Map()
    constructor(entries) {
      const base = geometry()
      base.computeBoundingSphere()
      this.geometries.set(0, base)
      const tree = new Tree(base, {indirect: true, setBoundingBox: false})
      this.tree = tree
      this.items = entries.map(entry => ({value: entry, geometry: base}))
    }
  }
`
test('couples an existing local geometry/BVH pair without annotations or changes to its dynamic consumers', async () => {
  const directory = await mkdtemp(join(import.meta.dirname, 'bvh-build-'))
  const originalFetch = globalThis.fetch
  try {
    const input = join(directory, 'entry.ts')
    await writeFile(input, source)
    const result = await build({
      configFile: false,
      root: directory,
      logLevel: 'silent',
      plugins: [bakeThreeGeometry({minimumBytes: 0})],
      build: {
        write: false,
        target: 'esnext',
        minify: false,
        rolldownOptions: {
          preserveEntrySignatures: 'strict',
          input,
          external: ['three/webgpu', 'three-mesh-bvh'],
        },
      },
    })
    if (Array.isArray(result) || !('output' in result)) {
      throw new Error('Unexpected build result')
    }
    const chunks = result.output.filter(item => item.type === 'chunk')
    const assets = result.output.filter(item => item.type === 'asset' && item.fileName.endsWith('.bin'))
    expect(chunks).toHaveLength(1)
    expect(assets).toHaveLength(1)
    const code = chunks[0].code
    expect(code).not.toContain('new Tree(')
    expect(code).not.toContain('new TorusKnotGeometry(')
    expect(code).toContain('MeshBVH.deserialize')
    expect(code).toContain('entries.map')
    globalThis.fetch = (async input => {
      const url = input instanceof Request ? input.url : String(input)
      const asset = assets.find(item => url.endsWith(item.fileName))
      if (asset?.type !== 'asset') {
        throw new Error(`Unexpected resource: ${url}`)
      }
      return new Response(asset.source as Uint8Array<ArrayBuffer>)
    }) as typeof fetch
    const output = join(directory, 'output.mjs')
    await writeFile(output, code)
    type Resources = {
      geometries: Map<number, BufferGeometry>
      items: Array<{
        geometry: BufferGeometry
        value: number
      }>
      tree: MeshBVH
    }
    const module = await import(pathToFileURL(output).href) as {Resources: new (entries: Array<number>) => Resources}
    const first = new module.Resources([7, 8])
    const second = new module.Resources([9])
    expect(first.tree.geometry).toBe(first.geometries.get(0)!)
    expect(first.items[0].geometry).toBe(first.tree.geometry)
    expect(first.items.map(item => item.value)).toEqual([7, 8])
    expect(first.tree).not.toBe(second.tree)
    expect(first.tree.geometry.boundingSphere).not.toBeNull()
    expect(first.tree.geometry.boundingBox).toBeNull()
  } finally {
    globalThis.fetch = originalFetch
    await rm(directory, {
      recursive: true,
      force: true,
    })
  }
})
test.each([
  ['disabled', source, false],
  ['overridden map method', source.replace('constructor(entries) {', 'constructor(entries) { this.geometries.set = (key, value) => { value.translate(5, 0, 0) };'), true],
  ['runtime geometry', source.replace('const base = geometry()', 'const base = entries[0]'), true],
  ['intervening mutation', source.replace('base.computeBoundingSphere()', 'base.translate(entries[0], 0, 0)'), true],
  ['progress callback', source.replace('indirect: true,', 'onProgress: () => {}, indirect: true,'), true],
])('declines unsafe or disabled BVH specialization: %s', async (_name, code, meshBvh) => {
  const directory = await mkdtemp(join(import.meta.dirname, 'bvh-decline-'))
  try {
    const input = join(directory, 'entry.ts')
    await writeFile(input, code)
    const result = await build({
      configFile: false,
      root: directory,
      logLevel: 'silent',
      plugins: [bakeThreeGeometry({
        meshBvh,
        minimumBytes: 0,
      })],
      build: {
        write: false,
        minify: false,
        target: 'esnext',
        rolldownOptions: {
          preserveEntrySignatures: 'strict',
          input,
          external: ['three/webgpu', 'three-mesh-bvh'],
        },
      },
    })
    if (Array.isArray(result) || !('output' in result)) {
      throw new Error('Unexpected build result')
    }
    const report = result.output.find(item => item.type === 'asset' && item.fileName === 'bake-three-geometry.json')
    if (report?.type !== 'asset') {
      throw new Error('Missing report')
    }
    const diagnostics = JSON.parse(String(report.source)) as {diagnostics: Array<{
      resources?: Array<string>
      status: string
    }>}
    expect(diagnostics.diagnostics.some(item => item.status === 'baked' && item.resources?.includes('mesh-bvh'))).toBe(false)
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    })
  }
})
