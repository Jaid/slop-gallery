import {describe, expect, test} from 'bun:test'

import vitePluginBakeBranchComponent from '../src/main.ts'

describe('vite adapter', () => {
  test('forwards the Branch Babel plugin through Rolldown Babel', async () => {
    const plugin = await vitePluginBakeBranchComponent()
    expect(plugin.name).toBe('@rolldown/plugin-babel')
  })
})
