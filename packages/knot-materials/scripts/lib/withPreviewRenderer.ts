import type KnotPreviewRenderer from './KnotPreviewRenderer.ts'
import type {JSHandle} from 'puppeteer-core'

import puppeteer, {TargetType} from 'puppeteer-core'

export type PreviewOptions = {
  browserURL?: string
  pageURL?: string
}

/** Attach to an existing Vite page without navigating or altering the live game. */
export default async function withPreviewRenderer<Result>(run: (renderer: JSHandle<KnotPreviewRenderer>) => Promise<Result>, {browserURL = 'http://127.0.0.1:9222', pageURL = 'https://vite.tower.lan'}: PreviewOptions = {}) {
  const origin = new URL(pageURL).origin
  const browser = await puppeteer.connect({
    browserURL,
    defaultViewport: null,
    protocolTimeout: 300_000,
  })
  let handle: JSHandle<KnotPreviewRenderer> | undefined
  try {
    const target = browser.targets().find(candidate => {
      if (candidate.type() !== TargetType.PAGE) {
        return false
      }
      try {
        return new URL(candidate.url()).origin === origin
      } catch {
        return false
      }
    })
    const page = await target?.page()
    if (!page) {
      throw new Error(`Open the Vite page at ${origin} in the debug browser first.`)
    }
    await page.waitForFunction(expectedOrigin => location.origin === expectedOrigin && document.readyState === 'complete', {timeout: 30_000}, origin)
    handle = await page.evaluateHandle(async baseURL => {
      const url = `${baseURL}/packages/knot-materials/scripts/lib/KnotPreviewRenderer.ts?t=${Date.now()}`
      const {default: Renderer} = await import(/* @vite-ignore */ url) as typeof import('./KnotPreviewRenderer.ts')
      const renderer = new Renderer
      try {
        await renderer.init()
        return renderer
      } catch (error) {
        await renderer.dispose()
        throw error
      }
    }, origin)
    return await run(handle)
  } finally {
    try {
      if (handle) {
        try {
          await handle.evaluate(renderer => renderer.dispose())
        } finally {
          await handle.dispose()
        }
      }
    } finally {
      await browser.disconnect()
    }
  }
}
