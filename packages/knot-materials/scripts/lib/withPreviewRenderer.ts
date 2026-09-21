import type KnotPreviewRenderer from './KnotPreviewRenderer.ts'
import type {JSHandle, Page} from 'puppeteer-core'

import {join, resolve} from 'node:path'

import puppeteer, {TargetType} from 'puppeteer-core'
import {createServer} from 'vite'

export type PreviewOptions = {
  browserURL?: string
  pageURL?: string
}

const repositoryRoot = resolve(import.meta.dir, '../../../..')
const renderPath = '/packages/knot-materials/scripts/render.html'
const rendererPath = '/packages/knot-materials/scripts/lib/KnotPreviewRenderer.ts'
const protocolTimeout = 300_000
const resolveChromeExecutable = async () => {
  const configured = Bun.env.BROWSER
  const candidates = [
    configured && (Bun.which(configured) ?? configured),
    Bun.which('chrome'),
    Bun.which('google-chrome'),
    Bun.which('google-chrome-stable'),
    Bun.which('chromium'),
    Bun.which('chromium-browser'),
    Bun.which('chrome.exe'),
    Bun.env.PROGRAMFILES && join(Bun.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    Bun.env['PROGRAMFILES(X86)'] && join(Bun.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ].filter((candidate): candidate is string => Boolean(candidate))
  for (const candidate of candidates) {
    if (await Bun.file(candidate).exists()) {
      return candidate
    }
  }
  throw new Error('Chrome was not found. Set BROWSER to its executable path.')
}
const createRenderer = async (page: Page, moduleURL: string) => {
  await page.waitForFunction(() => document.readyState === 'complete', {timeout: 30_000})
  return page.evaluateHandle(async url => {
    const {default: Renderer} = await import(/* @vite-ignore */ `${url}?t=${Date.now()}`) as typeof import('./KnotPreviewRenderer.ts')
    const renderer = new Renderer
    try {
      await renderer.init()
      return renderer
    } catch (error) {
      await renderer.dispose()
      throw error
    }
  }, moduleURL)
}
const runWithRenderer = async <Result>(page: Page, moduleURL: string, run: (renderer: JSHandle<KnotPreviewRenderer>) => Promise<Result>) => {
  const handle = await createRenderer(page, moduleURL)
  try {
    return await run(handle)
  } finally {
    try {
      await handle.evaluate(renderer => renderer.dispose())
    } finally {
      await handle.dispose()
    }
  }
}
const withExistingBrowser = async <Result>(run: (renderer: JSHandle<KnotPreviewRenderer>) => Promise<Result>, browserURL: string, pageURL = 'https://vite.tower.lan') => {
  const origin = new URL(pageURL).origin
  const browser = await puppeteer.connect({
    browserURL,
    defaultViewport: null,
    protocolTimeout,
  })
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
    return await runWithRenderer(page, `${origin}${rendererPath}`, run)
  } finally {
    await browser.disconnect()
  }
}

/** Own a private Vite page and Chrome instance unless an existing debug browser is explicitly requested. */
export default async function withPreviewRenderer<Result>(run: (renderer: JSHandle<KnotPreviewRenderer>) => Promise<Result>, {browserURL, pageURL}: PreviewOptions = {}) {
  if (browserURL) {
    return withExistingBrowser(run, browserURL, pageURL)
  }
  const server = await createServer({
    configFile: false,
    logLevel: 'error',
    optimizeDeps: {include: ['three', 'three/tsl', 'three/webgpu']},
    root: repositoryRoot,
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: true,
    },
  })
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined
  try {
    await server.listen()
    const address = server.httpServer?.address()
    if (!address || typeof address === 'string') {
      throw new Error('Vite did not expose a local TCP port.')
    }
    const origin = `http://127.0.0.1:${address.port}`
    browser = await puppeteer.launch({
      executablePath: await resolveChromeExecutable(),
      headless: true,
      protocolTimeout,
    })
    const page = await browser.newPage()
    await page.goto(`${origin}${renderPath}`, {
      waitUntil: 'networkidle0',
      timeout: 30_000,
    })
    return await runWithRenderer(page, `${origin}${rendererPath}`, run)
  } finally {
    try {
      await browser?.close()
    } finally {
      await server.close()
    }
  }
}
