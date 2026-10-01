import {expect, test} from 'bun:test'

test('the Three patch tracks the installed Three version and root lock', async () => {
  const manifest = await Bun.file('package.json').json() as {
    dependencies: {three: string}
    patchedDependencies: Record<string, string>
  }
  const patchKey = `three@${manifest.dependencies.three}`
  const patchPath = `patches/${patchKey}.patch`
  expect(manifest.patchedDependencies[patchKey]).toBe(patchPath)
  expect(await Bun.file(patchPath).exists()).toBe(true)
  expect(await Bun.file('bun.lock').text()).toContain(`"${patchKey}": "${patchPath}"`)
})
