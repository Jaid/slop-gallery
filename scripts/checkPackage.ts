import {mkdir, mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'

const root = resolve(import.meta.dir, '..')
const fixture = await mkdtemp(join(tmpdir(), 'slop-capture-consumer-'))
const archive = join(fixture, 'capture.tgz')
const consumer = join(fixture, 'consumer')
const manifest = await Bun.file(join(root, 'package.json')).json() as {dependencies: Record<string, string>
  devDependencies: Record<string, string>}
async function run(cwd: string, args: Array<string>) {
  const child = Bun.spawn([process.execPath, ...args], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const code = await child.exited
  if (code) {
    throw new Error(`Consumer check failed (${code}): ${args.join(' ')}`)
  }
}
try {
  await run(join(root, 'packages/webgpu-capture-bridge'), ['pm', 'pack', '--filename', archive, '--ignore-scripts'])
  const workspacePackages = ['telemethree', 'telemethree-ego', 'use-graphics-quality', 'three-fiber-game']
  for (const name of workspacePackages) {
    await run(join(root, 'packages', name), ['pm', 'pack', '--filename', join(fixture, `${name}.tgz`), '--ignore-scripts'])
  }
  await mkdir(consumer)
  const dependencies: Record<string, string> = {'webgpu-capture-bridge': 'file:../capture.tgz'}
  for (const name of workspacePackages) {
    dependencies[name] = `file:../${name}.tgz`
  }
  for (const name of ['three', 'react', 'react-dom', '@react-three/fiber', '@react-three/drei', '@react-three/rapier']) {
    dependencies[name] = manifest.dependencies[name]!
  }
  for (const name of ['@types/three', '@types/react', '@types/react-dom', '@types/bun', 'typescript']) {
    dependencies[name] = manifest.devDependencies[name]!
  }
  await Bun.write(join(consumer, 'package.json'), JSON.stringify({
    name: 'capture-consumer',
    private: true,
    type: 'module',
    dependencies,
    // These packages are not published yet; resolve their versioned transitive edges to the archives too.
    overrides: Object.fromEntries(workspacePackages.map(name => [name, `file:../${name}.tgz`])),
  }))
  await run(consumer, ['install', '--ignore-scripts'])
  const helpers = await Bun.file(join(root, 'packages/webgpu-capture-bridge/test/helpers.ts')).text()
  const tests = await Bun.file(join(root, 'packages/webgpu-capture-bridge/test/main.test.ts')).text()
  await Bun.write(join(consumer, 'helpers.ts'), helpers.replaceAll('../src/main.ts', 'webgpu-capture-bridge'))
  await Bun.write(join(consumer, 'main.test.ts'), tests.replaceAll('../src/main.ts', 'webgpu-capture-bridge'))
  await run(consumer, ['test', './main.test.ts'])
  const egoTests = await Bun.file(join(root, 'packages/telemethree-ego/test/main.test.ts')).text()
  await Bun.write(join(consumer, 'ego.test.ts'), egoTests.replaceAll('../src/main.ts', 'telemethree-ego'))
  await run(consumer, ['test', './ego.test.ts'])
  const graphicsTests = await Bun.file(join(root, 'packages/use-graphics-quality/test/main.test.tsx')).text()
  await Bun.write(join(consumer, 'graphics.test.tsx'), graphicsTests.replaceAll('../src/main.ts', 'use-graphics-quality'))
  await run(consumer, ['test', './graphics.test.tsx'])
  const gameTests = await Bun.file(join(root, 'packages/three-fiber-game/test/main.test.tsx')).text()
  await Bun.write(join(consumer, 'game-preload.ts'), await Bun.file(join(root, 'packages/three-fiber-game/test/preload.ts')).text())
  await Bun.write(join(consumer, 'game.test.tsx'), gameTests.replaceAll('../src/main.ts', 'three-fiber-game'))
  await run(consumer, ['test', '--preload', './game-preload.ts', './game.test.tsx'])
  await Bun.write(join(consumer, 'game-consumer.tsx'), [
    "import Game, {WebgpuRenderer} from 'three-fiber-game'",
    "import type {Controls, GameProps, GameWrapperProps, GameWrappers} from 'three-fiber-game'",
    "import {useThree} from '@react-three/fiber/webgpu'",
    "import {useKeyboardControls} from '@react-three/drei/webgpu'",
    'function SceneProvider({children}: GameWrapperProps) {',
    '  useThree(state => state.scene)',
    '  useKeyboardControls<"jump">()',
    '  return <>{children}</>',
    '}',
    'const wrappers = [SceneProvider] as const satisfies GameWrappers',
    'const controls = {jump: ["Space"]} as const satisfies Controls<"jump">',
    'const props = {controls, physics: true, sceneWrapper: wrappers} satisfies GameProps<"jump">',
    'export const example = <Game {...props} camera={{position: [0, 2, 5]}}><group/></Game>',
    'export const customized = <Game renderer={options => new WebgpuRenderer({...options, antialias: true})}/>',
  ].join('\n'))
  await Bun.write(join(consumer, 'consumer.ts'), [
    "import {WebgpuCapture} from 'webgpu-capture-bridge'",
    "import type {WebgpuCaptureOptions} from 'webgpu-capture-bridge'",
    "import {WebgpuCaptureBridge, useCaptureFrame} from 'webgpu-capture-bridge/react'",
    'export const capture = (options: WebgpuCaptureOptions) => new WebgpuCapture(options)',
    'export {WebgpuCaptureBridge, useCaptureFrame}',
    "export {Telemetry, OtlpHttpExporter, ThreeStatistics} from 'telemethree'",
    "export {TelemetryProvider, useTelemetry, useThreeTelemetry} from 'telemethree/react'",
    "export {GraphicsQualityProvider, useGraphicsQuality, useGraphicsQualityValue, useSetGraphicsQuality} from 'use-graphics-quality'",
    "export {EgoTelemetry} from 'telemethree-ego'",
    "export {useEgoTelemetry} from 'telemethree-ego/react'",
    "export {example, customized} from './game-consumer.tsx'",
  ].join('\n'))
  await run(consumer, ['node_modules/typescript/bin/tsc', '--noEmit', '--strict', '--skipLibCheck', '--module', 'preserve', '--moduleResolution', 'bundler', '--target', 'esnext', '--lib', 'esnext,dom,dom.iterable', '--types', 'bun', '--jsx', 'react-jsx', '--allowImportingTsExtensions', 'consumer.ts', 'game.test.tsx'])
  await Bun.write(join(consumer, 'build.ts'), [
    "import {webgpuResolution} from './game-preload.ts'",
    "const result = await Bun.build({entrypoints: ['./consumer.ts'], target: 'browser', outdir: '.', plugins: [webgpuResolution]})",
    "if (!result.success) throw new AggregateError(result.logs, 'Consumer browser build failed.')",
  ].join('\n'))
  await run(consumer, ['./build.ts'])
  console.log('Packed capture/ego/graphics/game tests, all package consumer types and React browser bundles passed.')
} finally {
  await rm(fixture, {
    recursive: true,
    force: true,
  })
}
