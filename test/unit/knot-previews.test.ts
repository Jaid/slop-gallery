import {expect, test} from 'bun:test'
import {fileURLToPath} from 'node:url'

import {knotCandidates} from 'knot-materials'

test('candidate symbols remain source assets while knot preview rasters are runtime-only', async () => {
  const persistedGlob = new Bun.Glob('packages/knot-materials/src/{candidates,entries}/*/icon.jxl')
  const persistedIcons = await Array.fromAsync(persistedGlob.scan('.'))
  expect(persistedIcons).toEqual([])
  for (const candidate of knotCandidates) {
    expect(candidate.data.icon).toEndWith(`/${candidate.data.id}/symbol.svg`)
    const symbol = Bun.file(fileURLToPath(candidate.data.icon))
    expect(await symbol.exists()).toBe(true)
    expect(await symbol.text()).toContain('<svg')
    for (const item of candidate.items) {
      expect('icon' in item).toBe(false)
    }
  }
})
