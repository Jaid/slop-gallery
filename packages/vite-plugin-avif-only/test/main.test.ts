import {afterEach, expect, test} from 'bun:test'
import {join, resolve} from 'node:path'

import fs from 'fs-extra'
import {build, createServer} from 'vite'

import gameLevel from '../../vite-plugin-game-level/src/main.ts'
import {AvifCache} from '../src/AvifCache.ts'
import avifOnly from '../src/main.ts'

const roots: Array<string> = []
afterEach(async () => {
  for (const root of roots.splice(0)) {
    await fs.remove(root)
  }
})
async function fixture() {
  const temporary = resolve(import.meta.dir, '../../../temp/plugin-tests')
  await fs.ensureDir(temporary)
  const root = await fs.mkdtemp(join(temporary, 'avif-'))
  roots.push(root)
  const source = resolve(import.meta.dir, 'fixture.jxl')
  for (const file of ['source/image.jxl', 'public/art/portrait.jxl', 'public/unused/hidden.jxl']) {
    await fs.ensureDir(join(root, file, '..'))
    await fs.copyFile(source, join(root, file))
  }
  await fs.writeFile(join(root, 'index.html'), '<img src="/art/portrait.jxl"><script type="module" src="/source/main.ts"></script>')
  await fs.writeFile(join(root, 'source/main.ts'), `import icon from './image.jxl'
import alias from '#art/image.jxl'
import './style.css'
// '/art/portrait.jxl' is a comment, not an asset reference.
const description = 'a photograph.jxl'
globalThis.assets = [icon, alias, new URL('./image.jxl', import.meta.url).href, '/art/portrait.jxl', description]
`)
  await fs.writeFile(join(root, 'source/style.css'), '.image { background: url("./image.jxl") }')
  return root
}
test('uses content-addressed AVIF caching and deduplicates concurrent encodes', async () => {
  const root = await fixture()
  const cache = new AvifCache(join(root, 'cache'))
  const source = join(root, 'source/image.jxl')
  const paths = await Promise.all([cache.convert(source), cache.convert(source), cache.convert(source)])
  expect(new Set(paths).size).toBe(1)
  expect(paths[0]).toMatch(/[0-9a-f]{64}\.avif$/u)
  expect((await fs.readFile(paths[0])).toString('ascii', 4, 8)).toBe('ftyp')
  const modified = (await fs.stat(paths[0])).mtimeMs
  expect(await new AvifCache(join(root, 'cache')).convert(source)).toBe(paths[0])
  expect((await fs.stat(paths[0])).mtimeMs).toBe(modified)
  expect(await new AvifCache(join(root, 'cache'), {quality: 51}).convert(source)).not.toBe(paths[0])
  expect(() => new AvifCache('unused', {quality: Number.NaN})).toThrow(RangeError)
}, 30_000)
test('serves AVIF for source and public URLs, with HEAD, ETag and the requested default cache', async () => {
  const root = await fixture()
  const server = await createServer({
    root,
    configFile: false,
    resolve: {alias: {'#art': join(root, 'source')}},
    logLevel: 'silent',
    plugins: [avifOnly()],
    server: {
      port: 0,
      host: '127.0.0.1',
    },
  })
  try {
    await server.listen()
    const address = server.httpServer!.address() as {port: number}
    const origin = `http://127.0.0.1:${address.port}`
    for (const path of ['/source/image.avif', '/art/portrait.avif?test=1']) {
      const response = await fetch(origin + path)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('image/avif')
      expect(Buffer.from(await response.arrayBuffer()).toString('ascii', 4, 8)).toBe('ftyp')
      expect((await fetch(origin + path, {headers: {'if-none-match': response.headers.get('etag')!}})).status).toBe(304)
      const head = await fetch(origin + path, {method: 'HEAD'})
      expect(head.status).toBe(200)
      expect(await head.text()).toBe('')
    }
    const transformed = await server.transformRequest('/source/main.ts')
    expect(transformed!.code).toContain('/art/portrait.avif')
    expect(transformed!.code).toContain('/source/image.avif')
    expect(transformed!.code).toContain("// '/art/portrait.jxl'")
    expect(await Array.fromAsync(new Bun.Glob('*.avif').scan(join(root, 'temp/vite-plugin-avif-only/cache')))).toHaveLength(1)
  } finally {
    await server.close()
  }
}, 30_000)
test('builds AVIF-only imports, new URLs, CSS and public images after level filtering', async () => {
  const root = await fixture()
  await build({
    root,
    base: '/nested/',
    configFile: false,
    resolve: {alias: {'#art': join(root, 'source')}},
    logLevel: 'silent',
    plugins: [
      gameLevel({
        level: 'gallery',
        levels: {
          gallery: {
            directory: 'source',
            publicAssets: ['art'],
          },
        },
      }), avifOnly(),
    ],
    build: {assetsInlineLimit: 0},
  })
  const files = await Array.fromAsync(new Bun.Glob('**/*').scan(join(root, 'dist')))
  expect(files.some(file => file.endsWith('.jxl'))).toBe(false)
  expect(files.some(file => file.replaceAll('\\', '/') === 'art/portrait.avif')).toBe(true)
  expect(files.some(file => file.includes('hidden'))).toBe(false)
  expect(await fs.readFile(join(root, 'dist/index.html'), 'utf8')).toContain('/nested/art/portrait.avif')
  const js = files.find(file => file.endsWith('.js'))!
  const code = await fs.readFile(join(root, 'dist', js), 'utf8')
  expect(code).toContain('/art/portrait.avif')
  expect(code).not.toContain('image.jxl')
}, 30_000)
