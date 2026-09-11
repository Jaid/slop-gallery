import {join} from 'node:path'

import {levelIds} from '../../src/data/levels.ts'

const requiredModules = {
  gallery: 'src/components/levels/gallery/Architecture/index.tsx',
  knottingham: 'src/components/levels/knottingham/KnotExhibition/index.tsx',
  soundboard: 'src/components/levels/soundboard/SoundboardRoom/index.tsx',
} as const
for (const level of levelIds) {
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
  if (report.level !== level || !report.modules.includes(requiredModules[level])) {
    throw new Error(`Invalid scene graph in ${level}.`)
  }
  for (const other of levelIds) {
    if (other !== level && report.modules.some(id => id.startsWith(`src/components/levels/${other}/`))) {
      throw new Error(`${other} components leaked into ${level}.`)
    }
  }
  if (level !== 'knottingham' && report.modules.some(id => id.startsWith('src/lib/knots/'))) {
    throw new Error(`Knot shaders or catalog leaked into ${level}.`)
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
  if (files.some(file => file.endsWith('.jxl'))) {
    throw new Error(`Unsupported JXL escaped the production build in ${level}.`)
  }
  if (level === 'gallery') {
    if (!files.some(file => file.replaceAll('\\', '/').startsWith('art/')) || !files.some(file => file.replaceAll('\\', '/').startsWith('audio/'))) {
      throw new Error('Gallery public assets are incomplete.')
    }
  } else {
    if (files.some(file => /^(?:art|audio)[/\\]/u.test(file))) {
      throw new Error(`Gallery public assets leaked into ${level}.`)
    }
    if (level === 'knottingham' && !files.some(file => file.endsWith('.avif'))) {
      throw new Error('Knottingham is missing generated preview assets.')
    }
    if (level === 'soundboard' && files.some(file => file.endsWith('.avif'))) {
      throw new Error('Soundboard unexpectedly contains image assets.')
    }
  }
  console.log(`Verified ${level}: independent scene graph and public assets.`)
}
