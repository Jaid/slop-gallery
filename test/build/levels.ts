import {join} from 'node:path'

for (const level of ['gallery', 'knottingham'] as const) {
  const build = Bun.spawn(['bun', 'run', `build:${level}`], {
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (await build.exited !== 0) {
    throw new Error(`Failed to build ${level}.`)
  }
  const directory = join('out/production', level)
  const report = await Bun.file(join(directory, 'level-build.json')).json() as {level: string
    modules: Array<string>}
  const knot = level === 'knottingham'
  const required = knot ? 'src/components/levels/knottingham/KnotExhibition/index.tsx' : 'src/components/levels/gallery/Architecture/index.tsx'
  const excluded = knot ? 'src/components/levels/gallery/Architecture/index.tsx' : 'src/components/levels/knottingham/KnotExhibition/index.tsx'
  if (report.level !== level || !report.modules.includes(required) || report.modules.includes(excluded)) {
    throw new Error(`Invalid scene graph in ${level}.`)
  }
  if (!knot && report.modules.some(id => id.startsWith('src/lib/knots/'))) {
    throw new Error('Knot shaders or catalog leaked into the museum.')
  }
  const other = knot ? 'gallery' : 'knottingham'
  if (report.modules.some(id => id.startsWith(`src/components/levels/${other}/`))) {
    throw new Error(`Opposite level components leaked into ${level}.`)
  }
  const files = await Array.fromAsync(new Bun.Glob('**/*').scan(directory))
  const primaryChunks = ['main.js', 'sub.js', 'react.js', 'three.js', 'rapier.js', 'vendor.js']
  if (primaryChunks.some(file => !files.includes(file))) {
    throw new Error(`Missing production chunk in ${level}.`)
  }
  if (files.some(file => /^material\d*\.js$/u.test(file))) {
    throw new Error(`Knot material code escaped the main chunk in ${level}.`)
  }
  const rapierMap = await Bun.file(join(directory, 'rapier.js.map')).json() as {sources: Array<string>}
  const physicsSources = rapierMap.sources.filter(source => source.includes('/@dimforge/rapier3d-compat/'))
  if (physicsSources.length !== 1 || !physicsSources[0].includes('@dimforge+rapier3d-compat@0.20.0/')) {
    throw new Error(`Expected exactly one Rapier 0.20 implementation in ${level}.`)
  }
  if (!rapierMap.sources.length || rapierMap.sources.some(source => !/\/node_modules\/(?:@[^/]+\/)?rapier[^/]*\//u.test(source.replaceAll('\\', '/')))) {
    throw new Error(`The Rapier chunk contains code outside Rapier packages in ${level}.`)
  }
  const subMap = await Bun.file(join(directory, 'sub.js.map')).json() as {sources: Array<string>}
  if (!subMap.sources.length || subMap.sources.some(source => !source.replaceAll('\\', '/').includes('/packages/'))) {
    throw new Error(`The sub chunk contains code outside local packages in ${level}.`)
  }
  const mainMap = await Bun.file(join(directory, 'main.js.map')).json() as {sources: Array<string>}
  if (mainMap.sources.some(source => source.replaceAll('\\', '/').includes('/packages/'))) {
    throw new Error(`Local package code leaked into the main chunk in ${level}.`)
  }
  const forbiddenAssets = knot ? /^(art|audio)[/\\]/u : /\.avif$/u
  if (files.some(file => file.endsWith('.jxl') || forbiddenAssets.test(file) && (knot || !file.replaceAll('\\', '/').startsWith('art/')))) {
    throw new Error(`Opposite public assets leaked into ${level}.`)
  }
  const hasAssets = knot ? files.some(file => file.endsWith('.avif')) : files.some(file => file.replaceAll('\\', '/').startsWith('art/'))
  if (!hasAssets) {
    throw new Error(`Missing level assets in ${level}.`)
  }
  console.log(`Verified ${level}: independent scene graph and public assets.`)
}
