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
let rendererSequence = 0
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
  const key = `__knotPreviewRenderer_${process.pid}_${rendererSequence++}`
  const handle = await page.evaluateHandle(async (url, rendererKey) => {
    const {default: Renderer} = await import(/* @vite-ignore */ `${url}?t=${Date.now()}`) as typeof import('./KnotPreviewRenderer.ts')
    const renderer = new Renderer
    try {
      await renderer.init()
      ;(globalThis as unknown as Record<string, KnotPreviewRenderer | undefined>)[rendererKey] = renderer
      return renderer
    } catch (error) {
      await renderer.dispose()
      throw error
    }
  }, moduleURL, key)
  return {
    handle,
    key,
  }
}
const disposeRenderer = async (page: Page, key: string) => page.evaluate(async rendererKey => {
  const registry = globalThis as unknown as Record<string, KnotPreviewRenderer | undefined>
  const renderer = registry[rendererKey]
  delete registry[rendererKey]
  await renderer?.dispose()
}, key)
const runWithRenderer = async <Result>(page: Page, moduleURL: string, run: (renderer: JSHandle<KnotPreviewRenderer>) => Promise<Result>) => {
  const {
    handle,
    key,
  } = await createRenderer(page, moduleURL)
  try {
    return await run(handle)
  } finally {
    try {
      await disposeRenderer(page, key)
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
