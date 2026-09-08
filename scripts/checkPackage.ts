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
  await mkdir(consumer)
  const dependencies: Record<string, string> = {'webgpu-capture-bridge': 'file:../capture.tgz'}
  for (const name of ['three', 'react', 'react-dom', '@react-three/fiber']) {
    dependencies[name] = manifest.dependencies[name]!
  }
  for (const name of ['@types/three', '@types/react', '@types/react-dom', 'typescript']) {
    dependencies[name] = manifest.devDependencies[name]!
  }
  await Bun.write(join(consumer, 'package.json'), JSON.stringify({
    name: 'capture-consumer',
    private: true,
    type: 'module',
    dependencies,
  }))
  await run(consumer, ['install', '--ignore-scripts'])
  const helpers = await Bun.file(join(root, 'packages/webgpu-capture-bridge/test/helpers.ts')).text()
  const tests = await Bun.file(join(root, 'packages/webgpu-capture-bridge/test/main.test.ts')).text()
  await Bun.write(join(consumer, 'helpers.ts'), helpers.replaceAll('../src/main.ts', 'webgpu-capture-bridge'))
  await Bun.write(join(consumer, 'main.test.ts'), tests.replaceAll('../src/main.ts', 'webgpu-capture-bridge'))
  await run(consumer, ['test', './main.test.ts'])
  await Bun.write(join(consumer, 'consumer.ts'), [
    "import {WebgpuCapture} from 'webgpu-capture-bridge'",
    "import type {WebgpuCaptureOptions} from 'webgpu-capture-bridge'",
    "import {WebgpuCaptureBridge, useCaptureFrame} from 'webgpu-capture-bridge/react'",
    'export const capture = (options: WebgpuCaptureOptions) => new WebgpuCapture(options)',
    'export {WebgpuCaptureBridge, useCaptureFrame}',
  ].join('\n'))
  await run(consumer, ['node_modules/typescript/bin/tsc', '--noEmit', '--strict', '--skipLibCheck', '--module', 'preserve', '--moduleResolution', 'bundler', '--target', 'esnext', '--lib', 'esnext,dom,dom.iterable', '--jsx', 'react-jsx', '--allowImportingTsExtensions', 'consumer.ts'])
  await run(consumer, ['build', './consumer.ts', '--target', 'browser', '--outfile', 'consumer.js'])
  console.log('Packed capture core tests, consumer types and optional React browser bundle passed.')
} finally {
  await rm(fixture, {
    recursive: true,
    force: true,
  })
}
