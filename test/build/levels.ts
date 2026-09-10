import {join} from 'node:path'

for (const level of ['gallery', 'knottingham'] as const) {
  const build = Bun.spawn(['bun', 'run', `build:${level}`], {
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (await build.exited !== 0) {
    throw new Error(`Failed to build ${level}.`)
  }
  const directory = join('dist', level)
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
