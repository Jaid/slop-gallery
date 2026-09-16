import type {Plans} from './fixture.ts'

import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import puppeteer from 'puppeteer-core'

import {compileStaticRendering} from '../../src/compile.ts'

const executablePath = process.env.BROWSER
if (!executablePath) {
  throw new Error('Set BROWSER to a Chromium executable with native WebGPU.')
}
const plans = {} as Plans
for (const kind of ['instances', 'bundles'] as const) {
  const width = kind === 'instances' ? '0.6' : '0.35 + index * 0.1'
  const code = `export function Scene() {return <group>{[0,1,2,3].map(index => <mesh key={index} position={[index * 1.1,0,0]}><boxGeometry args={[${width},0.6,0.6]} /><meshStandardNodeMaterial color='#b88655' roughness={0.75} /></mesh>)}</group>}`
  const compiled = await compileStaticRendering(code, join(import.meta.dirname, 'input.tsx'))
  if (compiled.plans.length !== 1) {
    throw new Error(`Expected exactly one ${kind} plan.`)
  }
  plans[kind] = compiled.plans[0].plan
  if (kind === 'instances' ? plans[kind].batches !== 1 : plans[kind].bundles !== 1) {
    throw new Error(`Compiler did not perform the requested ${kind} optimization.`)
  }
}
const result = await Bun.build({
  entrypoints: [join(import.meta.dirname, 'fixture.ts')],
  target: 'browser',
})
if (!result.success) {
  throw new AggregateError(result.logs, 'Browser fixture build failed.')
}
const source = await result.outputs[0].text()
const server = Bun.serve({
  port: 0,
  hostname: '127.0.0.1',
  fetch(request) {
    return new URL(request.url).pathname === '/fixture.js' ? new Response(source, {headers: {'Content-Type': 'text/javascript'}}) : new Response('<!doctype html><title>Static rendering regression</title>', {headers: {'Content-Type': 'text/html'}})
  },
})
const profile = await mkdtemp(join(tmpdir(), 'r3f-static-webgpu-'))
try {
  // Isolated headless browser and temporary profile; never the user's visible game session.
  const browser = await puppeteer.launch({
    executablePath,
    userDataDir: profile,
    headless: true,
    args: ['--enable-gpu', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist'],
  })
  try {
    const page = await browser.newPage()
    await page.goto(server.url.href)
    const report = await page.evaluate(async plans => {
      const path = '/fixture.js'
      const {default: verify} = await import(path) as typeof import('./fixture.ts')
      return verify(plans)
    }, plans)
    console.log(JSON.stringify(report, null, 2))
  } finally {
    await browser.close()
  }
} finally {
  await server.stop(true)
  await rm(profile, {
    recursive: true,
    force: true,
  })
}
