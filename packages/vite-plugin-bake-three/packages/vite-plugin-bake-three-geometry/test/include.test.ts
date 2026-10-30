import type {BakeDiagnostic, IncludeFilter} from 'vite-plugin-bake-core'

import {expect, test} from 'bun:test'
import {join} from 'node:path'

import fs from 'fs-extra'
import {build} from 'vite'

import bakeGeometry from '../src/main.ts'

const buildWith = async (include: Array<IncludeFilter>) => {
  const directory = await fs.mkdtemp(join(import.meta.dirname, 'include-'))
  try {
    // Like the Antechamber: two parameterless recipes in one module, and a component module calling them.
    await fs.writeFile(join(directory, 'shapes.ts'), `
      import {BoxGeometry, SphereGeometry} from 'three/webgpu'
      export function domeGeometry() { return new SphereGeometry(1, 48, 24) }
      export function latticeGeometry() { return new BoxGeometry(1, 1, 1, 16, 16, 16) }
    `)
    await fs.writeFile(join(directory, 'entry.ts'), `
      import {domeGeometry, latticeGeometry} from './shapes.ts'
      export function make(kind: string) { return kind === 'dome' ? domeGeometry() : latticeGeometry() }
    `)
    const result = await build({
      configFile: false,
      root: directory,
      logLevel: 'silent',
      plugins: [bakeGeometry({
        minimumBytes: 0,
        include,
      })],
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
    const report = result.output.find(item => item.type === 'asset' && item.fileName === 'bake-three-geometry.json')
    if (report?.type !== 'asset') {
      throw new Error('Missing report')
    }
    const {diagnostics} = JSON.parse(String(report.source)) as {diagnostics: Array<BakeDiagnostic>}
    return {
      baked: diagnostics.filter(item => item.status === 'baked').map(item => `${item.file} ${item.scope}`).toSorted(),
      code: result.output.filter(item => item.type === 'chunk').map(item => item.code).join('\n'),
      snapshots: result.output.filter(item => item.type === 'asset' && item.fileName.endsWith('.bin')).length,
    }
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    })
  }
}
test('a glob includes every recipe of the files it matches', async () => {
  const {baked, snapshots} = await buildWith(['shapes.ts'])
  expect(baked).toEqual(['shapes.ts domeGeometry', 'shapes.ts latticeGeometry'])
  expect(snapshots).toBe(2)
})
test('a scoped filter bakes only the recipes of its scope and leaves the others at runtime', async () => {
  const {baked, code, snapshots} = await buildWith([{
    glob: 'shapes.ts',
    scope: 'domeGeometry',
  }])
  expect(baked).toEqual(['shapes.ts domeGeometry'])
  expect(snapshots).toBe(1)
  expect(code).not.toContain('new SphereGeometry(1, 48, 24)')
  expect(code).toContain('new BoxGeometry(1, 1, 1, 16, 16, 16)')
})
test('a call site bakes a definition whose own scope is left out, instead of deferring to it', async () => {
  const {baked, code, snapshots} = await buildWith([{
    glob: 'shapes.ts',
    scope: 'domeGeometry',
  }, {
    glob: '**/entry.ts',
    scope: 'make/*',
  }])
  expect(baked).toEqual(['entry.ts make/latticeGeometry', 'shapes.ts domeGeometry'])
  expect(snapshots).toBe(2)
  expect(code).not.toContain('new BoxGeometry(1, 1, 1, 16, 16, 16)')
})
