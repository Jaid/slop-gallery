import type {Browser, Page} from 'puppeteer-core'

import {join, resolve, sep} from 'node:path'

import fs from 'fs-extra'
import puppeteer from 'puppeteer-core'
import {createServer} from 'vite'

import {defaultLevel, levelIds} from '#src/data/levels.ts'
import {maximumSeed, parseSeed} from '#src/lib/environmentSeed.ts'
import {queryParameters} from '#src/lib/queryOverrides.ts'
import {getAntiAliasing, readAntiAliasing} from '#src/lib/rendering/antiAliasing.ts'
import {readGraphicsMode} from '#src/lib/rendering/graphicsMode.ts'
import {readVisionMode} from '#src/lib/rendering/visionMode.ts'

export const repositoryRoot = resolve(import.meta.dir, '..', '..')
// seed and graphics have dedicated options with validation and defaults.
const queryOptionNames = queryParameters.filter(key => key !== 'seed' && key !== 'graphics').toSorted()
const queryOptions: Record<string, {type: 'string'}> = Object.fromEntries(queryOptionNames.map(key => [key, {type: 'string'}]))
/** Scripts pick their own default height; the width follows 16:9. */
export const galleryHelp = (defaultHeight = 720) => `  --level <id>            ${levelIds.join(', ')}. Default: GAME_LEVEL or the default level
  --target <dir>          use this static build (e.g. dist) instead of the dev server. Its level-build.json decides the level
  --graphics <mode>       mirrors ?graphics (fast, heavy or cinematic, which is heavy with larger maps and more samples for non-realtime renders). Default: heavy
  --seed <number>         mirrors ?seed, the environment seed (0–${maximumSeed}) that decides random details like the potted plants. Default: 1
  --width <pixels>        render width. Default: --height × 16/9, or ${Math.round(defaultHeight * 16 / 9)}
  --height <pixels>       render height. Default: --width × 9/16, or ${defaultHeight}
  --<parameter> <value>   mirrors ?<parameter>=<value> for every other URL query parameter the app reads, e.g. --vision_mode wireframe or --anti_aliasing false:
                          ${queryOptionNames.join(', ')}`
export const galleryOptions = {
  ...queryOptions,
  graphics: {
    type: 'string',
    default: 'heavy',
  },
  level: {type: 'string'},
  seed: {
    type: 'string',
    default: '1',
  },
  target: {type: 'string'},
  width: {type: 'string'},
  height: {type: 'string'},
} as const
export type GalleryValues = Partial<Record<string, boolean | string>> & {
  graphics: string
  height?: string
  level?: string
  seed: string
  target?: string
  width?: string
}
export type GallerySetup = Awaited<ReturnType<typeof resolveGallerySetup>>
export const parseNumbers = (value: string, name: string, lengths: Array<number>) => {
  const numbers = value.split(',').map(part => Number(part.trim()))
  if (!lengths.includes(numbers.length) || numbers.some(number => !Number.isFinite(number))) {
    throw new Error(`--${name} expects ${lengths.join(' or ')} comma-separated numbers, got “${value}”.`)
  }
  return numbers
}
const parseSize = (value: string | undefined, name: string) => {
  if (value === undefined) {
    return
  }
  const size = Number(value)
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new Error(`--${name} expects a positive whole number of pixels, got “${value}”.`)
  }
  return size
}
/** A missing side follows 16:9; without either, the default height. */
const resolveSize = (values: Pick<GalleryValues, 'height' | 'width'>, defaultHeight: number) => {
  const width = parseSize(values.width, 'width')
  const height = parseSize(values.height, 'height')
  if (width === undefined && height === undefined) {
    return {
      width: Math.round(defaultHeight * 16 / 9),
      height: defaultHeight,
    }
  }
  return {
    width: width ?? Math.round(height! * 16 / 9),
    height: height ?? Math.round(width! * 9 / 16),
  }
}
/** `auto` renders 60 frames for TRAA to converge, otherwise 2 so the latest pose is drawn. */
export const resolveSettle = (value: string, setup: Pick<GallerySetup, 'temporalAntiAliasing'>) => {
  if (value === 'auto') {
    return setup.temporalAntiAliasing ? 60 : 2
  }
  const [frames] = parseNumbers(value, 'settle', [1])
  if (!Number.isSafeInteger(frames) || frames < 0) {
    throw new Error(`--settle expects auto or a whole number of frames, got “${value}”.`)
  }
  return frames
}
export const degrees = (radians: number) => Math.round(radians * 180 / Math.PI * 1000) / 1000
export const radians = (value: number) => value * Math.PI / 180
export const timestamp = () => {
  const now = new Date
  return now.toISOString().replaceAll(/[.:]/gu, '-').replace(/-\d{3}Z$/u, '')
}
export const waitForFrames = (page: Page, count: number) => page.evaluate(async frames => {
  for (let index = 0; index < frames; index++) {
    await new Promise(requestAnimationFrame)
  }
}, count)
const serveStatic = (root: string) => Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const {pathname: encodedPathname} = new URL(request.url)
    const pathname = decodeURIComponent(encodedPathname)
    const file = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`)
    if (file !== root && !file.startsWith(root + sep)) {
      return new Response('Forbidden', {status: 403})
    }
    const isFile = await fs.stat(file).then(entry => entry.isFile(), () => false)
    return isFile ? new Response(Bun.file(file)) : new Response('Not found', {status: 404})
  },
})
const readBuildLevel = async (root: string) => {
  try {
    const {level} = JSON.parse(await fs.readFile(join(root, 'level-build.json'), 'utf8')) as {level?: string}
    return level
  } catch {
  }
}
/** Validates the shared gallery options before anything is started. */
export const resolveGallerySetup = async (values: GalleryValues, defaultHeight = 720) => {
  const target = values.target === undefined ? undefined : resolve(values.target)
  if (target !== undefined && !await fs.stat(join(target, 'index.html')).then(entry => entry.isFile(), () => false)) {
    throw new Error(`--target ${values.target} has no index.html. Build it first, e.g. bun run build.`)
  }
  if (target !== undefined && values.level !== undefined) {
    throw new Error('--level only applies to the dev server; a static --target already contains its level.')
  }
  const level = target === undefined ? values.level ?? Bun.env.GAME_LEVEL : await readBuildLevel(target)
  if (level !== undefined && !levelIds.includes(level as typeof levelIds[number])) {
    throw new Error(`--level must be one of: ${levelIds.join(', ')}.`)
  }
  const search = new URLSearchParams({
    ai: 'false',
    test: 'true',
  })
  const seed = parseSeed(values.seed)
  if (seed === undefined) {
    throw new Error(`--seed expects a whole number between 0 and ${maximumSeed}, got “${values.seed}”.`)
  }
  search.set('seed', String(seed))
  search.set('graphics', values.graphics)
  for (const key of queryOptionNames) {
    const value = values[key]
    if (typeof value === 'string') {
      search.set(key, value)
    }
  }
  // Mirrors GameScene: wireframe vision skips postprocessing, and with it any antialiasing.
  const page = `http://localhost/?${search}`
  const temporalAntiAliasing = readVisionMode(page) !== 'wireframe' && getAntiAliasing(readGraphicsMode(page), readAntiAliasing(page)) === 'traa'
  return {
    target,
    level,
    levelName: level ?? defaultLevel,
    search,
    seed,
    temporalAntiAliasing,
    viewport: resolveSize(values, defaultHeight),
  }
}
/** Starts a private Vite dev server, or serves the static target, and resolves with the page URL. Dispose it to stop the server. */
export const serveGallery = async (setup: GallerySetup, options: {
  /** Vite cache directory; a running dev server may share the default cache, and concurrent dependency optimization would invalidate each other’s chunks */
  cacheDir: string
}) => {
  const {target, level, search} = setup
  if (target === undefined && level !== undefined) {
    // vite.config.ts reads the level through loadEnv, which includes process.env.
    process.env.GAME_LEVEL = level
  }
  if (target !== undefined) {
    const staticServer = serveStatic(target)
    return {
      url: `http://127.0.0.1:${staticServer.port}/?${search}`,
      [Symbol.asyncDispose]: () => staticServer.stop(true),
    }
  }
  const server = await createServer({
    root: repositoryRoot,
    mode: 'development',
    logLevel: 'error',
    cacheDir: options.cacheDir,
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: true,
      // Source edits must not reload the page during a capture. HMR itself stays on: Vite needs it to reload the page after discovering and optimizing new dependencies.
      watch: null,
    },
  })
  try {
    await server.listen()
    const address = server.httpServer?.address()
    if (!address || typeof address === 'string') {
      throw new Error('Vite did not expose a local TCP port.')
    }
    return {
      url: `http://127.0.0.1:${address.port}/?${search}`,
      [Symbol.asyncDispose]: () => server.close(),
    }
  } catch (error) {
    await server.close()
    throw error
  }
}
/** Reports page errors and closes the browser when the tab crashes, so pending waits reject instead of hanging. */
export const watchPage = (page: Page) => {
  page.on('pageerror', error => console.error(`Page error: ${String(error)}`))
  // WebGPU validation errors only reach the console, and a failed pass silently leaves its target stale.
  page.on('console', message => {
    if (message.type() === 'error') {
      console.error(`Console error: ${message.text()}`)
    }
  })
  page.on('error', crash => {
    console.error(`Page crashed: ${String(crash)}`)
    void page.browser().close().catch((closeError: unknown) => console.error(`Closing the browser after the crash failed: ${String(closeError)}`))
  })
}
/** Waits until the scene is ready and checks the debug hooks that captures rely on. Fails early when the app shows its render error screen instead. */
export const waitForGallery = async (page: Page) => {
  const outcome = await page.waitForFunction(() => {
    // RenderError replaces the scene when WebGPU is missing or rendering threw, e.g. because no adapter could be created; ready would never come.
    const renderError = document.querySelector('[data-testid="render-error"]')
    if (renderError) {
      return {error: renderError.querySelector('h2')?.textContent ?? 'unknown'}
    }
    return Boolean(globalThis.slopGallery?.snapshot?.().ready && globalThis.slopGallery.captureFrame) && {}
  }, {timeout: 300_000})
  const {error} = await outcome.jsonValue() as {error?: string}
  if (error !== undefined) {
    throw new Error(`The gallery showed its render error screen (“${error}”). The console errors above name the cause.`)
  }
  if (!await page.evaluate(() => Boolean(globalThis.slopGallery!.pose))) {
    throw new Error('This build has no slopGallery.pose() hook. Rebuild it from a version that includes scripts/snap.ts.')
  }
  if (!await page.evaluate(() => globalThis.slopGallery!.snapshot!().webGPU)) {
    throw new Error('The browser fell back to WebGL. Captures need native WebGPU.')
  }
}
/**
 * Starts the gallery server and a private headless browser, then waits until the scene is ready.
 * Never touches the visible browser. Dispose the result to stop everything again.
 */
export const openHeadlessGallery = async (setup: GallerySetup, options: {
  /** Vite cache directory, see serveGallery */
  cacheDir: string
  /** runs in the page before any of its own scripts */
  initScript?: () => void
}) => {
  const server = await serveGallery(setup, options)
  let browser: Browser | undefined
  const close = async () => {
    try {
      await browser?.close()
    } finally {
      await server[Symbol.asyncDispose]()
    }
  }
  try {
    browser = await puppeteer.launch({
      executablePath: Bun.env.BROWSER,
      headless: true,
      protocolTimeout: 600_000,
      // Frames leave the page as raw uploads of tens of megabytes. With network tracking, Chrome echoes every upload body through
      // the DevTools protocol, which slows film.ts down about 15× at 2160p and can exceed Bun’s WebSocket message limit.
      networkEnabled: false,
      defaultViewport: {
        ...setup.viewport,
        deviceScaleFactor: 1,
      },
      // WebMCP lets scripts call the app’s own tools, see callWebmcpTool from capture-session/script.
      args: ['--enable-unsafe-webgpu', '--enable-features=WebMCP'],
    })
    const page = await browser.newPage()
    watchPage(page)
    if (options.initScript) {
      await page.evaluateOnNewDocument(options.initScript)
    }
    // Progress goes to stderr, so a script’s stdout stays its result.
    console.error(`Loading ${server.url}`)
    await page.goto(server.url, {
      waitUntil: 'domcontentloaded',
      timeout: 300_000,
    })
    await waitForGallery(page)
    return {
      page,
      [Symbol.asyncDispose]: close,
    }
  } catch (error) {
    await close()
    throw error
  }
}
