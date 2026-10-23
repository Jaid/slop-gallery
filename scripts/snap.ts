import type {CameraPose} from '#src/lib/diagnostics.ts'
import type {Vec3} from '#src/lib/gallery/types.ts'

import {join, relative} from 'node:path'
import {parseArgs} from 'node:util'

import capturePage from 'capture-page'
import {setWireframe} from 'capture-session/script'
import fs from 'fs-extra'
import getFree from 'get-free'
import {lossyJxlOptions} from 'knot-materials/scripts/lib/encodeJxl.ts'
import {Packr} from 'msgpackr'

import {degrees, galleryHelp, galleryOptions, parseNumbers, radians, repositoryRoot, resolveGallerySetup, resolveSettle, serveGallery, waitForFrames, waitForGallery, watchPage} from './lib/headlessGallery.ts'

const snapHeight = 1080
const help = `Usage: bun scripts/snap.ts [options]

Takes a headless photo of a level and writes it to out/snap/<name>.jxl, next to out/snap/<name>.msgpack with the X dump of the same view.
Starts a private Vite dev server (or serves --target) and a private headless browser through capture-page; never touches the visible browser.
The photo is a fresh WebGPU render of the scene, so menus and other DOM overlays are not in it.

Options:
${galleryHelp(snapHeight)}
  --position <x,y,z>      camera (eye) position in meters. Default: the player spawn
  --angle <yaw,pitch[,roll]>
                          camera angle in degrees. Yaw 0 looks toward −z, positive pitch looks up. Default: the player spawn
  --fov <degrees>         vertical field of view. Default: the game camera’s
  --jxl-distance <number> cjxl Butteraugli distance, 0 is lossless. Default: 1
  --settle <frames|auto>  frames to render after posing, lets temporal antialiasing converge. Default: auto, 60 with TRAA, otherwise 2
  --wireframe <json>      input for the app’s set_wireframe WebMCP tool, sent after posing, e.g. {"direction": "in", "position": [0, 0.5, -12], "radius": 6}
  --name <name>           output file name without extension. Default: the next free number, starting at 1
  -h, --help              show this help

Set BROWSER to a Chromium executable with WebGPU support.`
const snapRoot = join(repositoryRoot, 'out', 'snap')
const {values} = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    ...galleryOptions,
    angle: {type: 'string'},
    fov: {type: 'string'},
    help: {
      type: 'boolean',
      short: 'h',
    },
    'jxl-distance': {
      type: 'string',
      default: '1',
    },
    name: {type: 'string'},
    position: {type: 'string'},
    wireframe: {type: 'string'},
    settle: {
      type: 'string',
      default: 'auto',
    },
  },
})
if (values.help) {
  console.log(help)
  process.exit(0)
}
const setup = await resolveGallerySetup(values, snapHeight)
const settle = resolveSettle(values.settle, setup)
const position = values.position === undefined ? undefined : parseNumbers(values.position, 'position', [3]) as Vec3
const angle = values.angle === undefined ? undefined : parseNumbers(values.angle, 'angle', [2, 3])
const fov = values.fov === undefined ? undefined : parseNumbers(values.fov, 'fov', [1])[0]
if (fov !== undefined && (fov <= 0 || fov >= 180)) {
  throw new Error('--fov must be between 0 and 180 degrees.')
}
const jxlDistance = parseNumbers(values['jxl-distance'], 'jxl-distance', [1])[0]
const wireframe = values.wireframe === undefined ? undefined : JSON.parse(values.wireframe) as unknown
if (wireframe !== undefined && (typeof wireframe !== 'object' || wireframe === null || Array.isArray(wireframe))) {
  throw new Error('--wireframe needs a JSON object of set_wireframe input.')
}
type DownloadFrameResult = {
  dump: Record<string, unknown> | null
  height: number
  nonBlackFraction: number
  width: number
}
await using server = await serveGallery(setup, {cacheDir: 'node_modules/.vite-snap'})
console.log(`Loading ${server.url}`)
let pose: {
  fov: number | null
  position: Vec3
  rotation: Vec3
} | undefined
// The page renders and encodes the photo itself; download_frame hands it over as a browser download.
const capture = await capturePage(server.url, {
  browser: Bun.env.BROWSER,
  args: ['--enable-unsafe-webgpu'],
  ...setup.viewport,
  body: false,
  capture: 'download',
  timeout: 300_000,
  wait: 'domcontentloaded',
  hook: async page => {
    watchPage(page)
    await waitForGallery(page)
    pose = await page.evaluate((requested: Partial<CameraPose>) => globalThis.slopGallery!.pose!(requested), {
      position,
      rotation: angle ? [radians(angle[1]), radians(angle[0]), radians(angle[2] ?? 0)] as Vec3 : undefined,
      fov,
    })
    if (wireframe) {
      await setWireframe(page, wireframe as Record<string, unknown>)
    }
    // A new pose can bring artworks into view that still need decoding, and objects whose pipelines still compile.
    await waitForFrames(page, settle)
    await page.waitForFunction(() => {
      const {pendingImages, pendingPipelines} = globalThis.slopGallery!.snapshot!()
      return pendingImages === 0 && pendingPipelines === 0
    }, {timeout: 120_000})
    await waitForFrames(page, settle)
  },
  // Dumps before rendering, like X: the frame shows the view the dump describes.
  toolCalls: [{
    name: 'download_frame',
    input: {format: 'png'},
  }],
})
const frame = capture.toolResults[0] as DownloadFrameResult
if (frame.nonBlackFraction === 0) {
  throw new Error('The capture is completely black.')
}
await fs.mkdir(snapRoot, {recursive: true})
const isTaken = async (candidate: string) => await fs.pathExists(join(snapRoot, `${candidate}.jxl`)) || fs.pathExists(join(snapRoot, `${candidate}.msgpack`))
// Picked after the capture to keep the window for concurrent snaps short.
const name = values.name ?? await getFree('', isTaken, {
  connector: '',
  consistent: true,
})
const output = join(snapRoot, `${name}.jxl`)
const png = `${output}.png`
await fs.writeFile(png, capture.buffer)
try {
  await Bun.$`cjxl ${png} ${lossyJxlOptions(jxlDistance)} ${output}`.quiet()
} finally {
  await fs.rm(png, {force: true})
}
if (frame.dump) {
  // Plain MessagePack maps without msgpackr records, so any decoder reads it.
  const messagePack = new Packr({useRecords: false})
  await fs.writeFile(join(snapRoot, `${name}.msgpack`), messagePack.pack(frame.dump))
} else {
  console.warn('No X dump written: the player is not ready.')
}
const [pitch, yaw, roll] = pose!.rotation
console.log(`Wrote ${relative(repositoryRoot, output).replaceAll('\\', '/')} (${frame.width}×${frame.height})${frame.dump ? ' and its .msgpack X dump' : ''}`)
console.log(`--position ${pose!.position.map(value => Math.round(value * 1000) / 1000).join(',')} --angle ${[yaw, pitch, roll].map(degrees).join(',')} --fov ${pose!.fov}`)
