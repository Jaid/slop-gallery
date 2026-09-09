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
  const workspacePackages = ['telemethree', 'telemethree-ego', 'use-graphics-quality', 'three-fiber-game', 'ego-player']
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
  const playerManifest = await Bun.file(join(root, 'packages/ego-player/package.json')).json() as {devDependencies: Record<string, string>}
  dependencies['@dimforge/rapier3d-compat'] = playerManifest.devDependencies['@dimforge/rapier3d-compat']!
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
  for (const [source, target] of [['main.test.ts', 'player.test.ts'], ['react.test.tsx', 'player-react.test.tsx']] as const) {
    const playerTests = await Bun.file(join(root, 'packages/ego-player/test', source)).text()
    await Bun.write(join(consumer, target), playerTests.replaceAll('../src/main.ts', 'ego-player'))
    await run(consumer, ['test', '--preload', './game-preload.ts', `./${target}`])
  }
  await Bun.write(join(consumer, 'motor-consumer.ts'), [
    "import {EgoMotor, defaultEgoOptions} from 'ego-player/motor'",
    "if (typeof EgoMotor !== 'function' || defaultEgoOptions.speed !== 3) throw new Error('Motor exports are missing.')",
  ].join('\n'))
  // This entry must load in Bun without the React/WebGPU resolution preload.
  await run(consumer, ['./motor-consumer.ts'])
  await Bun.write(join(consumer, 'player-consumer.tsx'), [
    "import type {EgoAction, EgoInput, EgoPlayerHandle, EgoPlayerProps} from 'ego-player'",
    "import EgoPlayer, {egoControls} from 'ego-player'",
    "import Game from 'three-fiber-game'",
    "import {useKeyboardControls} from '@react-three/drei/webgpu'",
    "import {useRef} from 'react'",
    'function Player() {',
    '  const player = useRef<EgoPlayerHandle>(null)',
    '  const input = useKeyboardControls<EgoAction>()[1]',
    '  const props = {input, ref: player, onUpdate: state => state.velocity.x} satisfies EgoPlayerProps',
    '  return <EgoPlayer {...props}/>',
    '}',
    'export const keyboardPlayer = <Game controls={egoControls} physics><Player/></Game>',
    'const input: EgoInput = {forward: true}',
    'export const customPlayer = <EgoPlayer input={() => input} pointerLock={false} requirePointerLock={false}/>',
  ].join('\n'))
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
    "export {keyboardPlayer, customPlayer} from './player-consumer.tsx'",
    "export {example, customized} from './game-consumer.tsx'",
  ].join('\n'))
  await run(consumer, ['node_modules/typescript/bin/tsc', '--noEmit', '--strict', '--skipLibCheck', '--module', 'preserve', '--moduleResolution', 'bundler', '--target', 'esnext', '--lib', 'esnext,dom,dom.iterable', '--types', 'bun', '--jsx', 'react-jsx', '--allowImportingTsExtensions', 'consumer.ts', 'game.test.tsx', 'player.test.ts', 'player-react.test.tsx', 'motor-consumer.ts'])
  await Bun.write(join(consumer, 'build.ts'), [
    "import {webgpuResolution} from './game-preload.ts'",
    "const result = await Bun.build({entrypoints: ['./consumer.ts'], target: 'browser', outdir: '.', plugins: [webgpuResolution]})",
    "if (!result.success) throw new AggregateError(result.logs, 'Consumer browser build failed.')",
  ].join('\n'))
  await run(consumer, ['./build.ts'])
  console.log('Packed capture/ego/graphics/game/player tests, all package consumer types and React browser bundles passed.')
} finally {
  await rm(fixture, {
    recursive: true,
    force: true,
  })
}
