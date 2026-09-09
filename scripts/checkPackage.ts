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
  const telemetryPackages = ['telemethree', 'telemethree-ego', 'slop-gallery-telemethree']
  for (const name of telemetryPackages) {
    await run(join(root, 'packages', name), ['pm', 'pack', '--filename', join(fixture, `${name}.tgz`), '--ignore-scripts'])
  }
  await mkdir(consumer)
  const dependencies: Record<string, string> = {'webgpu-capture-bridge': 'file:../capture.tgz'}
  for (const name of telemetryPackages) {
    dependencies[name] = `file:../${name}.tgz`
  }
  for (const name of ['three', 'react', 'react-dom', '@react-three/fiber']) {
    dependencies[name] = manifest.dependencies[name]!
  }
  for (const name of ['@types/three', '@types/react', '@types/react-dom', '@types/bun', 'typescript', 'vite']) {
    dependencies[name] = manifest.devDependencies[name]!
  }
  await Bun.write(join(consumer, 'package.json'), JSON.stringify({
    name: 'capture-consumer',
    private: true,
    type: 'module',
    dependencies,
    // These packages are not published yet; resolve their versioned transitive edges to the archives too.
    overrides: Object.fromEntries(telemetryPackages.map(name => [name, `file:../${name}.tgz`])),
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
  await Bun.write(join(consumer, 'consumer.ts'), [
    "import {WebgpuCapture} from 'webgpu-capture-bridge'",
    "import type {WebgpuCaptureOptions} from 'webgpu-capture-bridge'",
    "import {WebgpuCaptureBridge, useCaptureFrame} from 'webgpu-capture-bridge/react'",
    'export const capture = (options: WebgpuCaptureOptions) => new WebgpuCapture(options)',
    'export {WebgpuCaptureBridge, useCaptureFrame}',
    "export {Telemetry, OtlpHttpExporter, ThreeStatistics} from 'telemethree'",
    "export {TelemetryProvider, useTelemetry, useThreeTelemetry} from 'telemethree/react'",
    "export {EgoTelemetry} from 'telemethree-ego'",
    "export {useEgoTelemetry} from 'telemethree-ego/react'",
    "export {SlopGalleryTelemetry, VictoriaExporter} from 'slop-gallery-telemethree'",
    "export {useSlopGalleryTelemetry} from 'slop-gallery-telemethree/react'",
  ].join('\n'))
  await run(consumer, ['node_modules/typescript/bin/tsc', '--noEmit', '--strict', '--skipLibCheck', '--module', 'preserve', '--moduleResolution', 'bundler', '--target', 'esnext', '--lib', 'esnext,dom,dom.iterable', '--jsx', 'react-jsx', '--allowImportingTsExtensions', 'consumer.ts'])
  await run(consumer, ['build', './consumer.ts', '--target', 'browser', '--outfile', 'consumer.js'])
  await Bun.write(join(consumer, 'server.ts'), "export {victoriaTelemetry, createVictoriaRelay} from 'slop-gallery-telemethree/vite'\n")
  await run(consumer, ['node_modules/typescript/bin/tsc', '--noEmit', '--strict', '--skipLibCheck', '--module', 'preserve', '--moduleResolution', 'bundler', '--target', 'esnext', '--allowImportingTsExtensions', 'server.ts'])
  await run(consumer, ['build', './server.ts', '--target', 'bun', '--outfile', 'server.js'])
  console.log('Packed capture/ego tests, all package consumer types and optional React browser bundles passed.')
} finally {
  await rm(fixture, {
    recursive: true,
    force: true,
  })
}
