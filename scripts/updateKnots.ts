import type KnotPreviewRenderer from './lib/knots/KnotPreviewRenderer.ts'
import type {PreviewCandidate} from './lib/knots/KnotPreviewRenderer.ts'
import type {Browser} from 'puppeteer-core'

import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {parseArgs} from 'node:util'

import fs from 'fs-extra'
import puppeteer, {TargetType} from 'puppeteer-core'

import {knotCandidates} from '../src/lib/knots/index.ts'
import {encodeJxl} from './lib/images/encodeJxl.ts'

const root = resolve(import.meta.dir, '..')

export default async function updateKnots({candidates = [], browserURL = 'http://127.0.0.1:9223', pageURL = 'https://vite.tower.lan'}: {
  browserURL?: string
  candidates?: ReadonlyArray<string>
  pageURL?: string
} = {}) {
  for (const id of candidates) {
    if (!knotCandidates.some(candidate => candidate.data.id === id)) {
      throw new Error(`Unknown Knot candidate: ${id}`)
    }
  }
  const selected = knotCandidates.filter(candidate => !candidates.length || candidates.includes(candidate.data.id))
  const inputs: Array<PreviewCandidate> = await Promise.all(selected.map(async candidate => ({
    id: candidate.data.id,
    title: candidate.data.title,
    items: candidate.items,
    selected: candidate.select().map(item => item.number),
    symbol: await Bun.file(join(root, 'scripts/assets/knots', `${candidate.data.id}.svg`)).text(),
  })))
  // Keep staging outside the Vite project root so generated intermediates cannot trigger a live-page reload.
  const staging = await fs.mkdtemp(join(tmpdir(), 'slop-gallery-knot-previews-'))
  let browser: Browser | undefined
  try {
    browser = await puppeteer.connect({
      browserURL,
      defaultViewport: null,
      protocolTimeout: 300_000,
    })
    const origin = new URL(pageURL).origin
    const target = browser.targets().find(candidate => {
      try {
        return candidate.type() === TargetType.PAGE && new URL(candidate.url()).origin === origin
      } catch {
        return false
      }
    })
    const page = await target?.page()
    if (!page) {
      throw new Error(`Open the Vite page at ${origin} in the debug browser first.`)
    }
    await page.waitForFunction(expectedOrigin => location.origin === expectedOrigin && document.readyState === 'complete', {timeout: 30_000}, origin)
    // Vite resolves the same Three/TSL modules as the game. No navigation, new tabs or viewport changes.
    const handle = await page.evaluateHandle(async baseURL => {
      const path = `${baseURL}/scripts/lib/knots/KnotPreviewRenderer.ts?t=${Date.now()}`
      const {default: KnotPreviewRenderer} = await import(/* @vite-ignore */ path) as typeof import('./lib/knots/KnotPreviewRenderer.ts')
      const renderer = new KnotPreviewRenderer
      try {
        await renderer.init()
        return renderer
      } catch (error) {
        renderer.dispose()
        throw error
      }
    }, origin)
    const outputs: Array<string> = []
    const stage = async (path: string, image: string) => {
      const output = join(staging, path)
      await fs.ensureDir(dirname(output))
      const input = `${output}.input.png`
      try {
        await Bun.write(input, Buffer.from(image, 'base64'))
        await encodeJxl(input, output)
      } finally {
        await fs.remove(input)
      }
      outputs.push(path)
    }
    try {
      for (const candidate of inputs) {
        const result = await handle.evaluate((renderer: KnotPreviewRenderer, input) => renderer.renderCandidate(input), candidate)
        await stage(`${candidate.id}/overview.jxl`, result.overview)
        await stage(`${candidate.id}/icon.jxl`, result.icon)
        for (const item of result.items) {
          await stage(`${candidate.id}/items/${item.id}/icon.jxl`, item.image)
        }
        console.log(`${candidate.id}: ${result.items.length} item icons, model icon and overview.`)
      }
    } finally {
      await handle.evaluate(renderer => renderer.dispose())
      await handle.dispose()
    }
    // Publish only after every requested shader and symbol has rendered successfully.
    for (const path of outputs) {
      const destination = join(root, 'src/lib/knots', path)
      await fs.ensureDir(dirname(destination))
      await fs.rename(join(staging, path), destination)
    }
    console.log(`Updated ${outputs.length} JXLs.`)
  } finally {
    try {
      await browser?.disconnect()
    } finally {
      await fs.remove(staging)
    }
  }
}

if (import.meta.main) {
  const {values, positionals} = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      'browser-url': {type: 'string'},
      'page-url': {type: 'string'},
    },
  })
  await updateKnots({
    candidates: positionals,
    browserURL: values['browser-url'],
    pageURL: values['page-url'],
  })
}
