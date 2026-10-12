import type {CameraPose} from '#src/lib/diagnostics.ts'
import type {Vec3} from '#src/lib/gallery/types.ts'
import type {Page} from 'puppeteer-core'

import {mkdir, rm, writeFile} from 'node:fs/promises'
import {join, relative, resolve} from 'node:path'
import {parseArgs} from 'node:util'

import puppeteer from 'puppeteer-core'
import {createServer} from 'vite'

import {defaultLevel, levelIds} from '#src/data/levels.ts'

import {lossyJxlOptions} from './lib/images/encodeJxl.ts'

const help = `Usage: bun scripts/snap.ts [options]

Takes a headless photo of a level and writes it to out/photos/<name>.jxl.
Starts a private Vite dev server and a private headless browser; never touches the visible browser.
The photo is a fresh WebGPU render of the scene, so menus and other DOM overlays are not in it.

Options:
  --level <id>            ${levelIds.join(', ')}. Default: GAME_LEVEL or the default level
  --position <x,y,z>      camera (eye) position in meters. Default: the player spawn
  --angle <yaw,pitch[,roll]>
                          camera angle in degrees. Yaw 0 looks toward −z, positive pitch looks up. Default: the player spawn
  --fov <degrees>         vertical field of view. Default: the game camera’s
  --graphics <mode>       mirrors ?graphics (heavy or fast). Default: the app default
  --vision-mode <mode>    mirrors ?vision_mode (wireframe). Default: none
  --viewport <WxH>        render size in pixels. Default: 3840x2160
  --jxl-distance <number> cjxl Butteraugli distance, 0 is lossless. Default: 1
  --settle <frames>       frames to render after posing, lets temporal antialiasing converge. Default: 60
  --name <name>           output file name without extension. Default: <level>-<timestamp>
  -h, --help              show this help

Set BROWSER (or CHROME_PATH) to a Chromium executable with WebGPU support.`
const repositoryRoot = resolve(import.meta.dir, '..')
const photoRoot = join(repositoryRoot, 'out', 'photos')
const parseNumbers = (value: string, name: string, lengths: Array<number>) => {
  const numbers = value.split(',').map(part => Number(part.trim()))
  if (!lengths.includes(numbers.length) || numbers.some(number => !Number.isFinite(number))) {
    throw new Error(`--${name} expects ${lengths.join(' or ')} comma-separated numbers, got “${value}”.`)
  }
  return numbers
}
const parseViewport = (value: string) => {
  const match = /^(\d+)\s*[x×]\s*(\d+)$/u.exec(value.trim())
  const width = Number(match?.[1])
  const height = Number(match?.[2])
  if (!match || width <= 0 || height <= 0) {
    throw new Error(`--viewport expects WIDTHxHEIGHT, got “${value}”.`)
  }
  return {
    width,
    height,
  }
}
const degrees = (radians: number) => Math.round(radians * 180 / Math.PI * 1000) / 1000
const radians = (value: number) => value * Math.PI / 180
const timestamp = () => {
  const now = new Date
  return now.toISOString().replaceAll(/[.:]/gu, '-').replace(/-\d{3}Z$/u, '')
}
const waitForFrames = (page: Page, count: number) => page.evaluate(async frames => {
  for (let index = 0; index < frames; index++) {
    await new Promise(requestAnimationFrame)
  }
}, count)
const {values} = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    angle: {type: 'string'},
    fov: {type: 'string'},
    graphics: {type: 'string'},
    help: {
      type: 'boolean',
      short: 'h',
    },
    'jxl-distance': {
      type: 'string',
      default: '1',
    },
    level: {type: 'string'},
    name: {type: 'string'},
    position: {type: 'string'},
    settle: {
      type: 'string',
      default: '60',
    },
    viewport: {
      type: 'string',
      default: '3840x2160',
    },
    'vision-mode': {type: 'string'},
  },
})
if (values.help) {
  console.log(help)
  process.exit(0)
}
const level = values.level ?? Bun.env.GAME_LEVEL
if (level !== undefined && !levelIds.includes(level as typeof levelIds[number])) {
  throw new Error(`--level must be one of: ${levelIds.join(', ')}.`)
}
const position = values.position === undefined ? undefined : parseNumbers(values.position, 'position', [3]) as Vec3
const angle = values.angle === undefined ? undefined : parseNumbers(values.angle, 'angle', [2, 3])
const fov = values.fov === undefined ? undefined : parseNumbers(values.fov, 'fov', [1])[0]
if (fov !== undefined && (fov <= 0 || fov >= 180)) {
  throw new Error('--fov must be between 0 and 180 degrees.')
}
const viewport = parseViewport(values.viewport)
const jxlDistance = parseNumbers(values['jxl-distance'], 'jxl-distance', [1])[0]
const settle = parseNumbers(values.settle, 'settle', [1])[0]
const name = values.name ?? `${level ?? defaultLevel}-${timestamp()}`
const output = join(photoRoot, `${name}.jxl`)
const search = new URLSearchParams({
  ai: 'false',
  test: 'true',
})
if (values.graphics !== undefined) {
  search.set('graphics', values.graphics)
}
if (values['vision-mode'] !== undefined) {
  search.set('vision_mode', values['vision-mode'])
}
if (level !== undefined) {
  // vite.config.ts reads the level through loadEnv, which includes process.env.
  process.env.GAME_LEVEL = level
}
const server = await createServer({
  root: repositoryRoot,
  mode: 'development',
  logLevel: 'error',
  server: {
    host: '127.0.0.1',
    port: 0,
    strictPort: true,
    // Source edits must not reload the page while a photo is being taken.
    hmr: false,
  },
})
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined
try {
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') {
    throw new Error('Vite did not expose a local TCP port.')
  }
  const url = `http://127.0.0.1:${address.port}/?${search}`
  browser = await puppeteer.launch({
    executablePath: Bun.env.BROWSER ?? Bun.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    protocolTimeout: 600_000,
    defaultViewport: {
      ...viewport,
      deviceScaleFactor: 1,
    },
    args: ['--enable-unsafe-webgpu'],
  })
  const page = await browser.newPage()
  page.on('pageerror', error => console.error(`Page error: ${String(error)}`))
  // A crashed tab never resolves pending waits; closing the browser rejects them.
  page.on('error', error => {
    console.error(`Page crashed: ${String(error)}`)
    void browser?.close()
  })
  console.log(`Loading ${url}`)
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 300_000,
  })
  await page.waitForFunction(() => globalThis.__gallery?.snapshot?.().ready && globalThis.__gallery.pose && globalThis.__gallery.captureFrame, {timeout: 300_000})
  if (!await page.evaluate(() => globalThis.__gallery!.snapshot!().webGPU)) {
    throw new Error('The browser fell back to WebGL. Photos need native WebGPU.')
  }
  const pose = await page.evaluate((requested: Partial<CameraPose>) => globalThis.__gallery!.pose!(requested), {
    position,
    rotation: angle ? [radians(angle[1]), radians(angle[0]), radians(angle[2] ?? 0)] as Vec3 : undefined,
    fov,
  })
  // A new pose can bring artworks into view that still need decoding.
  await waitForFrames(page, settle)
  await page.waitForFunction(() => globalThis.__gallery!.snapshot!().pendingImages === 0, {timeout: 120_000})
  await waitForFrames(page, settle)
  const frame = await page.evaluate(async () => {
    const {dataUrl, width, height, nonBlackFraction} = await globalThis.__gallery!.captureFrame!()
    return {
      png: dataUrl.slice(dataUrl.indexOf(',') + 1),
      width,
      height,
      nonBlackFraction,
    }
  })
  if (frame.nonBlackFraction === 0) {
    throw new Error('The capture is completely black.')
  }
  await mkdir(photoRoot, {recursive: true})
  const png = `${output}.png`
  await writeFile(png, Uint8Array.fromBase64(frame.png))
  try {
    await Bun.$`cjxl ${png} ${lossyJxlOptions(jxlDistance)} ${output}`.quiet()
  } finally {
    await rm(png, {force: true})
  }
  const [pitch, yaw, roll] = pose.rotation
  console.log(`Wrote ${relative(repositoryRoot, output).replaceAll('\\', '/')} (${frame.width}×${frame.height})`)
  console.log(`--position ${pose.position.map(value => Math.round(value * 1000) / 1000).join(',')} --angle ${[yaw, pitch, roll].map(degrees).join(',')} --fov ${pose.fov}`)
} finally {
  try {
    await browser?.close()
  } finally {
    await server.close()
  }
}
