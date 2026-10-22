import type {WorldAnalysis} from '#src/lib/webmcp/analyzeWorld.ts'

import {parseArgs} from 'node:util'

import {callWebmcpTool, galleryHelp, galleryOptions, openHeadlessGallery, resolveGallerySetup} from './lib/headlessGallery.ts'

const help = `Usage: bun scripts/analyzeWorld.ts [options]

Opens the level in a private headless browser, calls the app’s analyze_world WebMCP tool and prints its result as JSON: per room its floor footprint polygon, floor level, clear height, triangles, meshes and lights.
Starts a private Vite dev server (or serves --target); never touches the visible browser. Progress goes to stderr, so stdout can be redirected to a file.

Options:
${galleryHelp()}
  -h, --help              show this help

Set BROWSER to a Chromium executable with WebGPU support.`
const {values} = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    ...galleryOptions,
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
const setup = await resolveGallerySetup(values)
await using gallery = await openHeadlessGallery(setup, {cacheDir: 'node_modules/.vite-analyze-world'})
const analysis = await callWebmcpTool(gallery.page, 'analyze_world') as WorldAnalysis
console.log(JSON.stringify(analysis, null, 2))
