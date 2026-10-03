import {expect, test} from 'bun:test'
import {basename, join} from 'node:path'

import fs from 'fs-extra'

import withPreviewRenderer from '../scripts/lib/withPreviewRenderer.ts'

const {mkdtemp, rm, writeFile} = fs
// Exercise the real private server and held renderer; never edit a user's source file.
test.skipIf(Bun.env.KNOT_TEST_GPU !== '1')('offline renderer handles survive edits to an imported source module', async () => {
  const folder = await mkdtemp(join(import.meta.dir, 'preview-edit-'))
  const valueFile = join(folder, 'value.ts')
  const entry = `${basename(folder)}/entry.ts`
  const loadProbe = async (value: string, edit = false) => withPreviewRenderer(async handle => {
    await handle.evaluate(async (_renderer, relative) => {
      const script = document.createElement('script')
      script.type = 'module'
      const moduleURL = new URL(`../test/${relative}`, location.href)
      script.src = moduleURL.href
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timed out loading the source-edit probe.')), 10_000)
        script.addEventListener('load', () => {
          clearTimeout(timeout)
          resolve()
        }, {once: true})
        script.addEventListener('error', () => {
          clearTimeout(timeout)
          reject(new Error('Could not load the source-edit probe.'))
        }, {once: true})
        document.head.append(script)
      })
    }, entry)
    const read = () => handle.evaluate(renderer => ({
      rendererAvailable: typeof renderer.createPreview === 'function',
      value: (globalThis as unknown as {previewEditValue: string}).previewEditValue,
    }))
    expect(await read()).toEqual({
      rendererAvailable: true,
      value,
    })
    if (edit) {
      await writeFile(valueFile, "export const value = 'after'\n")
      // Give Vite's watcher and browser reload enough time to act. Reusing the
      // same handle throughout catches context destruction, not just a new page.
      for (let attempt = 0; attempt < 20; attempt++) {
        await Bun.sleep(100)
        expect(await read()).toEqual({
          rendererAvailable: true,
          value,
        })
      }
    }
  })
  try {
    await writeFile(valueFile, "export const value = 'before'\n")
    await writeFile(join(folder, 'entry.ts'), "import {value} from './value.ts'\n;(globalThis as unknown as {previewEditValue: string}).previewEditValue = value\n")
    await loadProbe('before', true)
    // A new offline session must still see the edited source, not a stale cache.
    await loadProbe('after')
  } finally {
    await rm(folder, {
      recursive: true,
      force: true,
    })
  }
}, 90_000)
