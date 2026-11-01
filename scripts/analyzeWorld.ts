import type {WorldAnalysis} from '#src/lib/webmcp/analyzeWorld.ts'

import {parseArgs} from 'node:util'

import {callWebmcpTool, waitForLoadingItems} from 'capture-session/script'

import {worlds} from '#src/worlds/index.ts'

import {galleryHelp, galleryOptions, openHeadlessGallery, resolveGallerySetup} from './lib/headlessGallery.ts'
import worldTables from './lib/worldTables.ts'

const formats = ['json', 'markdown'] as const
const help = `Usage: bun scripts/analyzeWorld.ts [options]

Opens the world in a private headless browser, calls the app’s analyze_world WebMCP tool and prints its result: per room its title, fence, static meshes, items that can be picked up and lights, plus what lies elsewhere and the global lights.
Starts a private Vite dev server (or serves --target); never touches the visible browser. Progress goes to stderr, so stdout can be redirected to a file.

Options:
  --format <format>       json prints the whole analysis, markdown tables of the rooms’ static meshes and items with their triangles and of their lamps and shadows. Default: json
${galleryHelp()}
  -h, --help              show this help

Set BROWSER to a Chromium executable with WebGPU support.`
const {values} = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    ...galleryOptions,
    format: {
      type: 'string',
      default: 'json',
    },
    help: {
      type: 'boolean',
      short: 'h',
    },
  },
})
if (values.help) {
  console.log(help)
  process.exit(0)
}
const format = values.format as typeof formats[number]
if (!formats.includes(format)) {
  throw new Error(`--format must be one of ${formats.join(', ')}, got “${values.format}”.`)
}
const setup = await resolveGallerySetup(values)
await using gallery = await openHeadlessGallery(setup, {cacheDir: 'node_modules/.vite-analyze-world'})
// Rooms other than the start room still download and mount after the scene is ready.
await waitForLoadingItems(gallery.page)
const analysis = await callWebmcpTool(gallery.page, 'analyze_world') as WorldAnalysis
console.log(format === 'markdown' ? worldTables(analysis, worlds[setup.world].title, values.graphics, setup.seed) : JSON.stringify(analysis, null, 2))
