import {expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import fs from 'fs-extra'
import {build} from 'vite'

import jxlHeadersPlugin, {headers} from '../src/main.ts'

test('emits a _headers file that serves JXL as image/jxl', async () => {
  const root = await fs.mkdtemp(join(tmpdir(), 'jxl-headers-'))
  try {
    await fs.outputFile(join(root, 'index.html'), '<!doctype html><script type="module" src="./main.js"></script>')
    await fs.outputFile(join(root, 'main.js'), 'console.log(1)')
    await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [jxlHeadersPlugin()],
    })
    expect(await fs.readFile(join(root, 'dist/_headers'), 'utf8')).toBe(headers)
    expect(headers).toContain('/*.jxl\n  Content-Type: image/jxl')
  } finally {
    await fs.remove(root)
  }
})
