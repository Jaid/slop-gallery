import type {WorldInfo} from '../../src/worlds/index.ts'

import {join} from 'node:path'

import {knots} from 'knot-materials'

import {worldIds, worlds} from '../../src/worlds/index.ts'

// Verifies the production build in dist (bun run build first): one page for every world, with each world, every Knot material and the Knots’ announcements in chunks of their own that only load on demand.
const directory = 'dist'
const everyFileGlob = new Bun.Glob('**/*')
const scanned = await Array.fromAsync(everyFileGlob.scan(directory))
const files = scanned.map(file => file.replaceAll('\\', '/'))
const fail = (message: string): never => {
  throw new Error(message)
}
if (files.some(file => file.endsWith('.map'))) {
  fail('A production source map escaped into the build.')
}
for (const chunk of ['main.js', 'sub.js', 'react.js', 'three.js', 'rapier.js', 'vendor.js', ...worldIds.map(id => `${id}.js`)]) {
  if (!files.includes(chunk)) {
    fail(`The build is missing ${chunk}.`)
  }
}
for (const folder of ['art/', 'audio/']) {
  if (!files.some(file => file.startsWith(folder))) {
    fail(`The gallery’s public ${folder} assets are missing.`)
  }
}
const html = await Bun.file(join(directory, 'index.html')).text()
if (html.includes('data:image/')) {
  fail('index.html inlines an image.')
}
for (const id of worldIds) {
  const {title, tagline, wallpaper}: WorldInfo = worlds[id]
  if (!html.includes(JSON.stringify(title)) || !html.includes(JSON.stringify(tagline))) {
    fail(`The loading screen does not know ${title}.`)
  }
  if (wallpaper && !files.includes(wallpaper)) {
    fail(`The loading screen’s wallpaper of ${title} is missing.`)
  }
}
const knotChunks = new Map(knots.map(knot => [`knot-${knot.id}.js`, knot.id]))
const missing = knotChunks.keys().filter(chunk => !files.includes(chunk)).toArray()
if (missing.length) {
  fail(`${missing.length} Knot materials have no chunk of their own, starting with ${missing[0]}.`)
}
/** the chunks a chunk imports statically, which load before it runs */
const staticImports = async (chunk: string) => {
  const code = await Bun.file(join(directory, chunk)).text()
  return code.matchAll(/(?<![\w$.])(?:export|import)(?:[\s{][^"';]*?from)?\s*["']\.\/([^"']+\.js)["']/gu).map(match => match[1]).toArray()
}
/** every chunk the chunk needs before it runs */
const closure = async (chunk: string) => {
  const seen = new Set<string>
  const pending = [chunk]
  while (pending.length) {
    const next = pending.pop()!
    if (seen.has(next)) {
      continue
    }
    seen.add(next)
    pending.push(...await staticImports(next))
  }
  return seen
}
// The page runs its module scripts and preloads the chunks they import.
const entries = html.matchAll(/<(?:script type="module"[^>]*src|link rel="modulepreload"[^>]*href)="\/([^"]+\.js)"/gu).map(match => match[1]).toArray()
if (!entries.includes('main.js')) {
  fail('index.html does not run main.js.')
}
const closures = await Promise.all(entries.map(closure))
const initial = new Set(closures.flatMap(chunks => [...chunks]))
for (const chunk of ['knot-catalog.js', 'knot-shaders.js']) {
  if (!files.includes(chunk)) {
    fail(`The build is missing ${chunk}.`)
  }
  if (initial.has(chunk)) {
    fail(`${chunk} loads with the page instead of on demand.`)
  }
}
if (files.some(file => /^data\d*\.js$/u.test(file))) {
  fail('The Knots’ metadata is split into a chunk per entry.')
}
for (const chunk of initial) {
  if (knotChunks.has(chunk) || worldIds.some(id => chunk === `${id}.js`)) {
    fail(`${chunk} loads with the page instead of on demand.`)
  }
}
const initialSources = await Promise.all([...initial].map(chunk => Bun.file(join(directory, chunk)).text()))
const initialCode = initialSources.join('\n')
// Every announcement goes by its path, like entries/<id> for a Knot’s title.
if (knots.some(knot => initialCode.includes(`"entries/${knot.id}"`))) {
  fail('The Knots’ announcements load with the page.')
}
for (const id of worldIds) {
  const chunks = await closure(`${id}.js`)
  // The page waits for its world in main.js, so a world importing it would wait for itself.
  if (chunks.has('main.js')) {
    fail(`The ${id} world imports main.js, which waits for it to load.`)
  }
  for (const chunk of chunks) {
    if (knotChunks.has(chunk) || worldIds.some(other => other !== id && chunk === `${other}.js`)) {
      fail(`The ${id} world loads ${chunk} with it.`)
    }
  }
}
// Only a material’s own chunk may hold it, so loading anything else never downloads a material, nor the textures baked for it.
for (const chunk of files) {
  if (!chunk.endsWith('.js') || knotChunks.has(chunk)) {
    continue
  }
  const imported = await staticImports(chunk)
  const leaked = imported.find(other => knotChunks.has(other))
  if (leaked) {
    fail(`${chunk} imports the Knot material chunk ${leaked}.`)
  }
}
// The Exhibition’s showcased Knots load their materials once they mount and their announcements once they first speak.
const exhibition = await closure('ExhibitionRoom.js')
if (exhibition.has('knottingham.js')) {
  fail('The Exhibition loads the Knottingham world with it.')
}
const exhibitionKnotChunks = [...exhibition].filter(other => knotChunks.has(other))
if (exhibitionKnotChunks.length) {
  fail(`The Exhibition loads ${exhibitionKnotChunks[0]} with it.`)
}
const exhibitionSources = await Promise.all([...exhibition].map(other => Bun.file(join(directory, other)).text()))
if (knots.some(knot => exhibitionSources.some(code => code.includes(`"entries/${knot.id}"`)))) {
  fail('The Exhibition loads the Knots’ announcements with it.')
}
console.log(`Verified the build: ${initial.size} chunks load with the page, ${knotChunks.size} Knot materials and ${worldIds.length} worlds load on demand.`)
