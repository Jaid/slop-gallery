import type {CameraPose} from '#src/lib/diagnostics.ts'
import type {Vec3} from '#src/lib/gallery/types.ts'

import {join, relative} from 'node:path'
import {parseArgs} from 'node:util'

import fs from 'fs-extra'
import {lossyJxlOptions} from 'knot-materials/scripts/lib/encodeJxl.ts'

import {degrees, galleryHelp, galleryOptions, openHeadlessGallery, parseNumbers, radians, repositoryRoot, resolveGallerySetup, timestamp, waitForFrames} from './lib/headlessGallery.ts'

const help = `Usage: bun scripts/snap.ts [options]

Takes a headless photo of a level and writes it to out/photos/<name>.jxl.
Starts a private Vite dev server (or serves --target) and a private headless browser; never touches the visible browser.
The photo is a fresh WebGPU render of the scene, so menus and other DOM overlays are not in it.

Options:
${galleryHelp}
  --position <x,y,z>      camera (eye) position in meters. Default: the player spawn
  --angle <yaw,pitch[,roll]>
                          camera angle in degrees. Yaw 0 looks toward −z, positive pitch looks up. Default: the player spawn
  --fov <degrees>         vertical field of view. Default: the game camera’s
  --jxl-distance <number> cjxl Butteraugli distance, 0 is lossless. Default: 1
  --settle <frames>       frames to render after posing, lets temporal antialiasing converge. Default: 60
  --name <name>           output file name without extension. Default: <level>-<timestamp>
  -h, --help              show this help

Set BROWSER to a Chromium executable with WebGPU support.`
const photoRoot = join(repositoryRoot, 'out', 'photos')
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
    settle: {
      type: 'string',
      default: '60',
    },
  },
})
if (values.help) {
  console.log(help)
  process.exit(0)
}
const setup = await resolveGallerySetup(values)
const position = values.position === undefined ? undefined : parseNumbers(values.position, 'position', [3]) as Vec3
const angle = values.angle === undefined ? undefined : parseNumbers(values.angle, 'angle', [2, 3])
const fov = values.fov === undefined ? undefined : parseNumbers(values.fov, 'fov', [1])[0]
if (fov !== undefined && (fov <= 0 || fov >= 180)) {
  throw new Error('--fov must be between 0 and 180 degrees.')
}
const jxlDistance = parseNumbers(values['jxl-distance'], 'jxl-distance', [1])[0]
const settle = parseNumbers(values.settle, 'settle', [1])[0]
const name = values.name ?? `${setup.levelName}-${timestamp()}`
const output = join(photoRoot, `${name}.jxl`)
await using gallery = await openHeadlessGallery(setup, {cacheDir: 'node_modules/.vite-snap'})
const {page} = gallery
const pose = await page.evaluate((requested: Partial<CameraPose>) => globalThis.slopGallery!.pose!(requested), {
  position,
  rotation: angle ? [radians(angle[1]), radians(angle[0]), radians(angle[2] ?? 0)] as Vec3 : undefined,
  fov,
})
// A new pose can bring artworks into view that still need decoding, and objects whose pipelines still compile.
await waitForFrames(page, settle)
await page.waitForFunction(() => {
  const {pendingImages, pendingPipelines} = globalThis.slopGallery!.snapshot!()
  return pendingImages === 0 && pendingPipelines === 0
}, {timeout: 120_000})
await waitForFrames(page, settle)
const frame = await page.evaluate(async () => {
  const {dataUrl, width, height, nonBlackFraction} = await globalThis.slopGallery!.captureFrame!()
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
await fs.mkdir(photoRoot, {recursive: true})
const png = `${output}.png`
await fs.writeFile(png, Uint8Array.fromBase64(frame.png))
try {
  await Bun.$`cjxl ${png} ${lossyJxlOptions(jxlDistance)} ${output}`.quiet()
} finally {
  await fs.rm(png, {force: true})
}
const [pitch, yaw, roll] = pose.rotation
console.log(`Wrote ${relative(repositoryRoot, output).replaceAll('\\', '/')} (${frame.width}×${frame.height})`)
console.log(`--position ${pose.position.map(value => Math.round(value * 1000) / 1000).join(',')} --angle ${[yaw, pitch, roll].map(degrees).join(',')} --fov ${pose.fov}`)
