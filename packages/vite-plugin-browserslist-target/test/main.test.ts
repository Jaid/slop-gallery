import type {BuildOptions, InlineConfig} from 'vite'

import {afterEach, beforeEach, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {relative, resolve} from 'node:path'

import browserslist from 'browserslist'
import fs from 'fs-extra'
import {build, resolveConfig} from 'vite'

import browserslistTargetPlugin from '../src/main.ts'

const environmentKeys = ['BROWSERSLIST', 'BROWSERSLIST_CONFIG', 'BROWSERSLIST_ENV', 'BROWSERSLIST_ROOT_PATH', 'NODE_ENV'] as const
const environment: Partial<Record<typeof environmentKeys[number], string>> = {}
let root: string
beforeEach(async () => {
  for (const key of environmentKeys) {
    environment[key] = process.env[key]
    delete process.env[key]
  }
  root = await fs.mkdtemp(resolve(tmpdir(), 'browserslist-target-'))
  process.env.BROWSERSLIST_ROOT_PATH = root
  browserslist.clearCaches()
})
afterEach(async () => {
  for (const key of environmentKeys) {
    if (environment[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = environment[key]
    }
  }
  browserslist.clearCaches()
  await fs.remove(root)
})
const resolveFixture = (config: InlineConfig = {}) => resolveConfig({
  root,
  configFile: false,
  logLevel: 'silent',
  plugins: [browserslistTargetPlugin()],
  ...config,
}, 'build')
test('infers the minimum browser version from .browserslistrc and lets CSS inherit it', async () => {
  await fs.writeFile(resolve(root, '.browserslistrc'), 'Chrome >= 100\n')
  const config = await resolveFixture()
  expect(config.build.target).toEqual(['chrome100'])
  expect(config.build.cssTarget).toEqual(config.build.target)
})
test('reads package.json and normalizes browser aliases and version ranges', async () => {
  await fs.writeFile(resolve(root, 'package.json'), JSON.stringify({
    browserslist: ['Chrome 100', 'Chrome 110', 'Firefox 100', 'ios_saf 15.2-15.3'],
  }))
  const config = await resolveFixture()
  expect(config.build.target).toEqual(['chrome100', 'firefox100', 'ios15.2'])
})
test('reads a browserslist file from a relative Vite root', async () => {
  await fs.writeFile(resolve(root, 'browserslist'), 'Chrome 110\n')
  const config = await resolveFixture({root: relative(process.cwd(), root)})
  expect(config.build.target).toEqual(['chrome110'])
})
test('finds the repository config above a nested Vite root', async () => {
  await fs.writeFile(resolve(root, '.browserslistrc'), 'Chrome 110\n')
  const nested = resolve(root, 'packages/app')
  await fs.ensureDir(nested)
  const config = await resolveFixture({root: nested})
  expect(config.build.target).toEqual(['chrome110'])
})
test('honors BROWSERSLIST instead of the config file', async () => {
  await fs.writeFile(resolve(root, '.browserslistrc'), 'Chrome 100\n')
  process.env.BROWSERSLIST = 'Firefox 110'
  const config = await resolveFixture()
  expect(config.build.target).toEqual(['firefox110'])
})
test('honors BROWSERSLIST_CONFIG without an explicit Vite root', async () => {
  const configFile = resolve(root, 'custom-browsers')
  await fs.writeFile(configFile, 'Firefox 110\n')
  process.env.BROWSERSLIST_CONFIG = configFile
  const config = await resolveFixture({root: undefined})
  expect(config.build.target).toEqual(['firefox110'])
})
test('honors BROWSERSLIST_ENV before NODE_ENV and Vite mode', async () => {
  await fs.writeFile(resolve(root, '.browserslistrc'), '[production]\nChrome 100\n[modern]\nChrome 110\n')
  process.env.BROWSERSLIST_ENV = 'modern'
  process.env.NODE_ENV = 'production'
  const config = await resolveFixture({mode: 'staging'})
  expect(config.build.target).toEqual(['chrome110'])
})
test('uses NODE_ENV rather than Vite mode when BROWSERSLIST_ENV is absent', async () => {
  await fs.writeFile(resolve(root, '.browserslistrc'), '[production]\nChrome 100\n[staging]\nChrome 110\n')
  process.env.NODE_ENV = 'production'
  const config = await resolveFixture({mode: 'staging'})
  expect(config.build.target).toEqual(['chrome100'])
})
test('uses Browserslist defaults when there is no repository config', async () => {
  const config = await resolveFixture()
  expect(Array.isArray(config.build.target)).toBe(true)
  expect(config.build.target).not.toHaveLength(0)
})
const explicitTargets: Array<{target: NonNullable<BuildOptions['target']>}> = [
  {target: 'esnext'},
  {target: 'chrome109'},
  {target: ['chrome109', 'firefox110']},
  {target: false},
]
test.each(explicitTargets)('preserves explicit build.target %j without reading Browserslist', async ({target}) => {
  await fs.writeFile(resolve(root, '.browserslistrc'), 'not a valid browser query\n')
  const config = await resolveFixture({build: {target}})
  expect(config.build.target).toEqual(target)
})
test('preserves an explicit CSS target and unrelated build options', async () => {
  await fs.writeFile(resolve(root, '.browserslistrc'), 'Chrome 100\n')
  const config = await resolveFixture({build: {
    cssTarget: 'chrome90',
    assetsInlineLimit: 128,
  }})
  expect(config.build.target).toEqual(['chrome100'])
  expect(config.build.cssTarget).toBe('chrome90')
  expect(config.build.assetsInlineLimit).toBe(128)
})
test.each(['Chrome < 1', 'op_mini all'])('rejects an empty conversion for %s', async query => {
  await fs.writeFile(resolve(root, '.browserslistrc'), query)
  return expect(resolveFixture()).rejects.toThrow('did not resolve to any supported Vite build targets')
})
test('reports invalid Browserslist queries', async () => {
  await fs.writeFile(resolve(root, '.browserslistrc'), 'not a valid browser query\n')
  return expect(resolveFixture()).rejects.toThrow()
})
test('a real Vite build lowers syntax for the inferred target', async () => {
  await fs.writeFile(resolve(root, '.browserslistrc'), 'Chrome 79\n')
  const entry = resolve(root, 'main.js')
  await fs.writeFile(entry, 'globalThis.result = globalThis.input?.value ?? 42')
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [browserslistTargetPlugin()],
    build: {
      write: false,
      minify: false,
      rolldownOptions: {input: entry},
    },
  })
  if (Array.isArray(result) || 'close' in result) {
    throw new TypeError('Expected one completed build output.')
  }
  const code = result.output.filter(output => output.type === 'chunk').map(chunk => chunk.code).join('\n')
  expect(code).toContain('globalThis.result')
  expect(code).not.toContain('?.')
  expect(code).not.toContain('??')
})
