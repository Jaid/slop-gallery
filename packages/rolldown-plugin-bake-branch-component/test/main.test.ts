import {describe, expect, test} from 'bun:test'
import {join, resolve} from 'node:path'

import fs from 'fs-extra'
import {build} from 'vite'

import rolldownPluginBakeBranchComponent from '../src/main.ts'

describe('Rolldown adapter', () => {
  test('compiles Branch JSX away in a real build', async () => {
    const temporary = resolve(import.meta.dir, '../../../temp/plugin-tests')
    await fs.ensureDir(temporary)
    const directory = await fs.mkdtemp(join(temporary, 'bake-branch-'))
    try {
      await fs.writeFile(join(directory, 'entry.jsx'), `
        import Branch from 'branch-component'
        export const view = (visible, Thing) => <Branch if={visible}><Thing /></Branch>
      `)
      const result = await build({
        configFile: false,
        root: directory,
        logLevel: 'silent',
        plugins: [await rolldownPluginBakeBranchComponent()],
        build: {
          write: false,
          minify: false,
          target: 'esnext',
          rolldownOptions: {
            preserveEntrySignatures: 'strict',
            input: join(directory, 'entry.jsx'),
            external: [/^react(?:\/|$)/u],
          },
        },
      })
      if (Array.isArray(result) || !('output' in result)) {
        throw new Error('Unexpected Vite output')
      }
      const code = result.output.filter(item => item.type === 'chunk').map(item => item.code).join('\n')
      expect(code).not.toContain('branch-component')
      expect(code).toMatch(/visible \? .+ : null;/su)
    } finally {
      await fs.remove(directory)
    }
  })
})
