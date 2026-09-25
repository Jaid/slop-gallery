import {expect, test} from 'bun:test'
import {join} from 'node:path'

import fs from 'fs-extra'
import {build} from 'vite'

import bakeThree, {bakeStaticTextures, bakeThreeGeometry, r3fStaticRendering} from '../src/main.ts'

const pluginName = (plugin: ReturnType<typeof bakeThree>[number]) => {
  if (!plugin || typeof plugin !== 'object' || !('name' in plugin)) {
    throw new TypeError('Expected a concrete Vite plugin.')
  }
  return plugin.name
}
test('combines the Three baking passes in dependency order', () => {
  expect(bakeThree().map(pluginName)).toEqual([
    'bake-three-geometry',
    'bake-static-textures',
    'r3f-static-rendering',
  ])
})
test('passes options through and can disable individual passes', () => {
  expect(bakeThree({
    geometry: false,
    staticTextures: false,
    staticRendering: {report: false},
  }).map(pluginName)).toEqual(['r3f-static-rendering'])
})
test('forwards allowFreezingRandomness to enabled passes', async () => {
  const directory = await fs.mkdtemp(join(import.meta.dirname, 'random-build-'))
  try {
    await fs.outputFile(join(directory, 'entry.ts'), `
      import {DataTexture} from 'three/webgpu'
      export function texture() {
        return new DataTexture(new Uint8Array([Math.floor(Math.random() * 256), 0, 0, 255]), 1, 1)
      }
    `)
    const result = await build({
      configFile: false,
      root: directory,
      logLevel: 'silent',
      plugins: bakeThree({
        allowFreezingRandomness: true,
        geometry: false,
        staticRendering: false,
        staticTextures: {minimumBytes: 0},
      }),
      build: {
        write: false,
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
    expect(result.output.filter(item => item.type === 'asset' && item.fileName.endsWith('.bin'))).toHaveLength(1)
  } finally {
    await fs.remove(directory)
  }
})
test('re-exports individual plugin factories', () => {
  expect(bakeThreeGeometry).toBeFunction()
  expect(bakeStaticTextures).toBeFunction()
  expect(r3fStaticRendering).toBeFunction()
})
