import {describe, expect, test} from 'bun:test'

import rolldownPluginBakeBranchComponent from '../src/main.ts'

describe('Rolldown adapter', () => {
  test('forwards the Branch Babel plugin through Rolldown Babel', async () => {
    const plugin = await rolldownPluginBakeBranchComponent()
    expect(plugin.name).toBe('@rolldown/plugin-babel')
  })
})
