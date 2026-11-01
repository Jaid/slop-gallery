import type {Rolldown} from 'vite'

import {afterAll, beforeAll, describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import fs from 'fs-extra'
import {build, createServer, parseSync} from 'vite'

import {applyEdits, findImports} from '../src/imports.ts'
import jxlPlugin, {getTargetSize, virtualJxlPrefix} from '../src/main.ts'

// A bare codestream or the ISO BMFF container around one.
const isJxl = (bytes: Uint8Array) => bytes[0] === 0xFF && bytes[1] === 0x0A || Buffer.from(bytes.subarray(4, 8)).toString('latin1') === 'JXL '
let root: string
const size = async (bytes: Uint8Array) => {
  const file = join(root, `identify-${crypto.randomUUID()}.jxl`)
  await fs.outputFile(file, bytes)
  const dimensions = await Bun.$`magick identify -format %wx%h ${file}`.quiet().text()
  await fs.remove(file)
  return dimensions.trim()
}
const runBuild = async (main: string, options: Parameters<typeof jxlPlugin>[0] = {}) => {
  await fs.outputFile(join(root, 'main.ts'), main)
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      jxlPlugin({
        folder: 'cache',
        effort: 3,
        ...options,
      }),
    ],
    build: {
      write: false,
      assetsInlineLimit: 0,
    },
  }) as Rolldown.RolldownOutput
  const assets = result.output.filter(output => output.type === 'asset')
  const chunk = result.output.find((output): output is Rolldown.OutputChunk => output.type === 'chunk' && output.isEntry)!
  return {
    assets,
    chunk,
  }
}
beforeAll(async () => {
  root = await fs.mkdtemp(join(tmpdir(), 'vite-plugin-jxl-'))
  await fs.outputFile(join(root, 'index.html'), '<!doctype html><script type="module" src="./main.ts"></script>')
  await Bun.$`magick -size 200x100 gradient:red-blue ${join(root, 'wide.png')}`.quiet()
  await Bun.$`magick -size 60x120 plasma:fractal -seed 1 ${join(root, 'photo.jpg')}`.quiet()
})
afterAll(async () => {
  await fs.remove(root)
})
describe('findImports', () => {
  test('covers the specifier and its attribute clause, also behind non-ASCII text', () => {
    const code = '// “Bilder” – ü\nimport a from \'./a.png\' with {format: \'jxl\', "maximumLong": \'3840\',}\nimport b from \'./b.png\'\nimport type c from \'./c.png\' with {format: \'jxl\'}\nexport {default as d} from \'./d.png\' with {format: \'jxl\'}\nconst e: number = 1\n'
    const imports = findImports(code, parseSync('main.ts', code).program)
    expect(imports.map(({source, attributes}) => ({
      source,
      attributes,
    }))).toEqual([
      {
        source: './a.png',
        attributes: {
          format: 'jxl',
          maximumLong: '3840',
        },
      },
      {
        source: './d.png',
        attributes: {format: 'jxl'},
      },
    ])
    const edited = applyEdits(code, imports.map(({start, end}) => ({
      start,
      end,
      text: '"x"',
    })))
    expect(edited).toContain('import a from "x"\n')
    expect(edited).toContain('export {default as d} from "x"\n')
    expect(edited).toContain('import b from \'./b.png\'\n')
  })
  test('lists imports without attributes only if their source matches', () => {
    const code = 'import a from \'./a.png\'\nimport b from \'./b.ts\'\n'
    const imports = findImports(code, parseSync('main.js', code).program, source => source.endsWith('.png'))
    expect(imports.map(({source}) => source)).toEqual(['./a.png'])
  })
})
describe('getTargetSize', () => {
  test('fits the tighter of both limits, keeping the aspect ratio', () => {
    expect(getTargetSize(200, 100, {maximumPixels: 5000})).toEqual({
      width: 100,
      height: 50,
    })
    expect(getTargetSize(200, 100, {
      maximumLong: 80,
      maximumPixels: 5000,
    })).toEqual({
      width: 80,
      height: 40,
    })
    expect(getTargetSize(200, 100, {
      maximumLong: 150,
      maximumPixels: 5000,
    })).toEqual({
      width: 100,
      height: 50,
    })
    expect(getTargetSize(5504, 3096, {maximumLong: 3840})).toEqual({
      width: 3840,
      height: 2160,
    })
    const {width, height} = getTargetSize(6000, 4000, {maximumPixels: 8_294_400})!
    expect(width * height).toBeLessThanOrEqual(8_294_400)
    expect(width / height).toBeCloseTo(1.5, 3)
  })
  test('leaves images alone that fit', () => {
    expect(getTargetSize(200, 100, {})).toBeUndefined()
    expect(getTargetSize(200, 100, {
      maximumLong: 200,
      maximumPixels: 20_000,
    })).toBeUndefined()
  })
})
describe('build', () => {
  test('encodes imports with format jxl and leaves the others alone', async () => {
    const {assets, chunk} = await runBuild('import encoded from \'./wide.png\' with {format: \'jxl\', maximumLong: \'50\', distance: \'2\'}\nimport plain from \'./wide.png\'\nimport full from \'./wide.png\' with {format: \'jxl\'}\nconsole.log(encoded, plain, full)\n')
    const jxlAssets = assets.filter(asset => asset.fileName.endsWith('.jxl'))
    expect(jxlAssets).toHaveLength(2)
    for (const asset of jxlAssets) {
      expect(asset.names).toEqual(['wide.jxl'])
      expect(asset.originalFileNames).toEqual(['wide.png'])
      expect(isJxl(asset.source as Uint8Array)).toBe(true)
      expect(chunk.code).toContain(`/${asset.fileName}`)
    }
    const dimensions = await Promise.all(jxlAssets.map(asset => size(asset.source as Uint8Array)))
    expect(dimensions.toSorted()).toEqual(['200x100', '50x25'])
    expect(assets.some(asset => asset.fileName.endsWith('.png'))).toBe(true)
    expect(chunk.code).not.toContain(virtualJxlPrefix)
  })
  test('scales images down to maximumPixels', async () => {
    const {assets} = await runBuild('import url from \'./wide.png\' with {format: \'jxl\', maximumPixels: \'5000\'}\nimport both from \'./wide.png\' with {format: \'jxl\', maximumPixels: \'5000\', maximumLong: \'80\'}\nconsole.log(url, both)\n')
    const dimensions = await Promise.all(assets.filter(asset => asset.fileName.endsWith('.jxl')).map(asset => size(asset.source as Uint8Array)))
    expect(dimensions.toSorted()).toEqual(['100x50', '80x40'])
  })
  test('never scales images up', async () => {
    const {assets} = await runBuild('import url from \'./wide.png\' with {format: \'jxl\', maximumLong: \'4000\', maximumPixels: \'1000000\'}\nconsole.log(url)\n')
    expect(await size(assets.find(asset => asset.fileName.endsWith('.jxl'))!.source as Uint8Array)).toBe('200x100')
  })
  test('transcodes JPEGs at distance 0 without loss', async () => {
    const {assets} = await runBuild('import url from \'./photo.jpg\' with {format: \'jxl\', distance: \'0\'}\nconsole.log(url)\n')
    const asset = assets.find(output => output.fileName.endsWith('.jxl'))!
    // The reconstruction data cjxl keeps of the JPEG.
    expect(Buffer.from(asset.source as Uint8Array).includes('jbrd')).toBe(true)
  })
  test('ignores other formats', async () => {
    const {assets} = await runBuild('import url from \'./wide.png\' with {format: \'avif\'}\nconsole.log(url)\n')
    expect(assets.map(asset => asset.fileName).filter(name => name.endsWith('.jxl'))).toEqual([])
  })
  test('encodes the images include names without the attribute', async () => {
    const {assets} = await runBuild('import url from \'./wide.png\'\nimport scaled from \'./wide.png\' with {maximumLong: \'20\'}\nimport photo from \'./photo.jpg\'\nconsole.log(url, scaled, photo)\n', {include: /\.png$/u})
    const names = assets.map(asset => asset.fileName)
    expect(names.filter(name => name.endsWith('.jxl'))).toHaveLength(2)
    expect(names.some(name => name.endsWith('.png'))).toBe(false)
    expect(names.some(name => name.endsWith('.jpg'))).toBe(true)
  })
  test('caches encoded images', async () => {
    const folder = join(root, 'cache')
    await fs.remove(folder)
    const main = 'import url from \'./wide.png\' with {format: \'jxl\', maximumLong: \'30\'}\nconsole.log(url)\n'
    await runBuild(main)
    const [entry] = await fs.readdir(folder)
    const {mtimeMs} = await fs.stat(join(folder, entry))
    await runBuild(main)
    expect(await fs.readdir(folder)).toEqual([entry])
    const stats = await fs.stat(join(folder, entry))
    expect(stats.mtimeMs).toBe(mtimeMs)
  })
  test('rejects unknown and invalid attributes', async () => {
    await expect(runBuild('import url from \'./wide.png\' with {format: \'jxl\', quality: \'90\'}\nconsole.log(url)\n')).rejects.toThrow('unknown attribute quality')
    await expect(runBuild('import url from \'./wide.png\' with {format: \'jxl\', maximumLong: \'0\'}\nconsole.log(url)\n')).rejects.toThrow('maximumLong')
    await expect(runBuild('import url from \'./wide.png\' with {format: \'jxl\', maximumPixels: \'1e6\'}\nconsole.log(url)\n')).rejects.toThrow('maximumPixels')
    await expect(runBuild('import url from \'./wide.png\' with {format: \'jxl\', distance: \'26\'}\nconsole.log(url)\n')).rejects.toThrow('distance')
  })
})
test('points imports to the encoded image in development', async () => {
  await fs.outputFile(join(root, 'main.ts'), 'import url from \'./wide.png\' with {format: \'jxl\', maximumLong: \'40\'}\nconsole.log(url)\n')
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [jxlPlugin({
      folder: 'cache',
      effort: 3,
    })],
    server: {middlewareMode: true},
  })
  try {
    const main = await server.transformRequest('/main.ts')
    const imported = /from\s+"([^"]+)"/u.exec(main!.code)![1]
    expect(imported).toContain('virtual:jxl')
    // What Vite’s middleware unwraps from the browser’s request.
    const virtual = await server.transformRequest(imported.replace('/@id/__x00__', '\0'))
    const cached = /"\/(cache\/[\da-f]{64}\.jxl)\?(?:import&)?url"/u.exec(virtual!.code)?.[1]
    expect(cached).toBeDefined()
    expect(await size(await fs.readFile(join(root, cached!)))).toBe('40x20')
  } finally {
    await server.close()
  }
})
