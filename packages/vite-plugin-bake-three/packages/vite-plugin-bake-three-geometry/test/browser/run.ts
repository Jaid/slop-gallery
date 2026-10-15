import type {BakeAdapter} from 'vite-plugin-bake-core'

import {tmpdir} from 'node:os'
import {join} from 'node:path'

import fs from 'fs-extra'
import puppeteer from 'puppeteer-core'
import {DataTexture, SRGBColorSpace, TorusKnotGeometry} from 'three/webgpu'
import {SnapshotWriter} from 'vite-plugin-bake-core'
import {threeAdapter} from 'vite-plugin-bake-core/three'

import {renderCanvasTexture} from '../../../vite-plugin-bake-static-textures/src/canvas.ts'
import {staticTexturesAdapter} from '../../../vite-plugin-bake-static-textures/src/main.ts'

const executablePath = Bun.env.BROWSER
if (!executablePath) {
  throw new Error('Set BROWSER to a Chromium executable with native WebGPU.')
}
const pack = (value: unknown, adapter: BakeAdapter) => {
  const writer = new SnapshotWriter(adapter, 16 * 1024 * 1024, () => false)
  return writer.write(value).toBase64()
}
const geometry = new TorusKnotGeometry(0.45, 0.13, 48, 12)
geometry.rotateY(0.2)
geometry.computeTangents()
geometry.computeBoundingBox()
const texture = new DataTexture(new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255]), 2, 2)
texture.colorSpace = SRGBColorSpace
texture.flipY = true
texture.needsUpdate = true
const canvas = renderCanvasTexture({width: 16, height: 16, mipmaps: false, draw(context) {
  context.fillStyle = '#734129'
  context.fillRect(0, 0, 16, 16)
  context.fillStyle = '#e0b040'
  context.fillRect(2, 3, 5, 7)
}})
const fixtures = {
  geometry: pack(geometry, threeAdapter({
    name: 'test',
    kind: 'geometry',
  })),
  texture: pack(texture, staticTexturesAdapter()),
  canvas: pack(canvas, staticTexturesAdapter()),
}
geometry.dispose()
texture.dispose()
canvas.dispose()
const result = await Bun.build({
  entrypoints: [join(import.meta.dirname, 'roundTrip.ts')],
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
    const requestUrl = new URL(request.url)
    return requestUrl.pathname === '/fixture.js' ? new Response(source, {headers: {'Content-Type': 'text/javascript'}}) : new Response('<!doctype html><title>Baked resource regression</title>', {headers: {'Content-Type': 'text/html'}})
  },
})
const profile = await fs.mkdtemp(join(tmpdir(), 'baked-webgpu-'))
try {
  // A separate headless browser/profile; never the user's visible desktop session.
  await using browser = await puppeteer.launch({
    executablePath,
    userDataDir: profile,
    headless: true,
    args: ['--enable-gpu', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist'],
  })
  const page = await browser.newPage()
  await page.goto(server.url.href)
  const report = await page.evaluate(async pageFixtures => {
    const fixture = '/fixture.js'
    const {default: verify} = await import(fixture) as typeof import('./roundTrip.ts')
    return verify(pageFixtures)
  }, fixtures)
  console.log(JSON.stringify(report, null, 2))
} finally {
  await server.stop(true)
  await fs.rm(profile, {
    recursive: true,
    force: true,
  })
}
