import type {WorldAnalysis, WorldRegion} from '#src/lib/webmcp/analyzeWorld.ts'

import {parseArgs} from 'node:util'

import {callWebmcpTool, waitForLoadingItems} from 'capture-session/script'

import {worlds} from '#src/worlds/index.ts'

import {galleryHelp, galleryOptions, openHeadlessGallery, resolveGallerySetup} from './lib/headlessGallery.ts'

const formats = ['json', 'markdown'] as const
const help = `Usage: bun scripts/analyzeWorld.ts [options]

Opens the world in a private headless browser, calls the app’s analyze_world WebMCP tool and prints its result: per room its title, fence, meshes with their triangles and lights, plus what lies elsewhere and the global lights.
Starts a private Vite dev server (or serves --target); never touches the visible browser. Progress goes to stderr, so stdout can be redirected to a file.

Options:
  --format <format>       json prints the whole analysis, markdown a table of the rooms’ triangles, meshes and lights, most triangles first. Default: json
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
/** counts of 10 000 and more split their thousands by narrow no-break spaces */
const formatCount = (count: number) => (count < 10_000 ? String(count) : count.toLocaleString('en-US').replaceAll(',', '\u{202F}'))
const summarize = (region: WorldRegion) => ({
  triangles: region.meshes.reduce((sum, mesh) => sum + mesh.triangles, 0),
  meshes: region.meshes.length,
  lights: region.lights.length,
})
const toMarkdown = (analysis: WorldAnalysis, title: string, graphics: string) => {
  const rooms = Object.values(analysis.rooms).map(room => ({
    title: room.title,
    ...summarize(room),
  })).toSorted((a, b) => b.triangles - a.triangles)
  const elsewhere = summarize(analysis.elsewhere)
  const rows = elsewhere.meshes || elsewhere.lights ? [
    ...rooms,
    {
      title: 'Elsewhere',
      ...elsewhere,
    },
  ] : rooms
  const total = {
    title: '**Total**',
    triangles: rows.reduce((sum, row) => sum + row.triangles, 0),
    meshes: rows.reduce((sum, row) => sum + row.meshes, 0),
    lights: rows.reduce((sum, row) => sum + row.lights, 0) + analysis.globalLights.length,
  }
  return [
    `## ${title} (${graphics} graphics)`,
    '',
    '| Room | Triangles | Meshes | Lights |',
    '| --- | --: | --: | --: |',
    ...[...rows, total].map(row => `| ${row.title} | ${formatCount(row.triangles)} | ${formatCount(row.meshes)} | ${formatCount(row.lights)} |`),
    '',
    'Elsewhere holds passages, stairways and the outdoors; the total’s lights include the global ones.',
    '',
  ].join('\n')
}
const setup = await resolveGallerySetup(values)
await using gallery = await openHeadlessGallery(setup, {cacheDir: 'node_modules/.vite-analyze-world'})
// Rooms other than the start room still download and mount after the scene is ready.
await waitForLoadingItems(gallery.page)
const analysis = await callWebmcpTool(gallery.page, 'analyze_world') as WorldAnalysis
console.log(format === 'markdown' ? toMarkdown(analysis, worlds[setup.world].title, values.graphics) : JSON.stringify(analysis, null, 2))
