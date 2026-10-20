import type {Vec3} from '../src/lib/gallery/types.ts'

import {expect, test} from 'bun:test'

import {openHeadlessGallery, resolveGallerySetup, waitForFrames} from '../scripts/lib/headlessGallery.ts'

// Uses the baked production level, not a source-only fixture: catches old slab/collider wiring, sky integration and graphics-mode lifetime errors.
test.skipIf(Bun.env.LIVE_TEST !== 'true')('production Lobby: cathedral views, clear roof, graphics switching and removal of the old low collider', async () => {
  const setup = await resolveGallerySetup({
    target: Bun.env.LIVE_TARGET ?? 'dist',
    seed: '1',
    graphics: 'heavy',
    'anti-aliasing': 'false',
    width: '1280',
    height: '720',
  })
  await using gallery = await openHeadlessGallery(setup, {
    cacheDir: 'node_modules/.vite-lobby-test',
    initScript: () => performance.setResourceTimingBufferSize(2000),
  })
  const {page} = gallery
  const errors: Array<string> = []
  page.on('pageerror', error => errors.push(String(error)))
  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  const failedResources = await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => (entry as PerformanceResourceTiming).responseStatus >= 400).map(entry => entry.name))
  expect(failedResources).toEqual([])
  // Run the detached GPU regression in the same native WebGPU browser, isolated from the game’s renderer and resources.
  const build = await Bun.build({
    entrypoints: ['test/browser/lobbyCeiling.ts'],
    target: 'browser',
  })
  expect(build.success).toBe(true)
  const bytes = new Uint8Array(await build.outputs[0].arrayBuffer())
  const fixture = `data:text/javascript;base64,${bytes.toBase64()}`
  const hdr = await page.evaluate(async url => {
    const {default: verify} = await import(url) as {default: () => Promise<unknown>}
    return verify()
  }, fixture)
  console.log('Lobby HDR:', JSON.stringify(hdr))
  const capture = async (name: string, position: Vec3, yaw: number, pitch: number, fov = 80) => {
    await page.evaluate((p, y, x, field) => globalThis.slopGallery!.pose!({
      position: p,
      rotation: [x * Math.PI / 180, y * Math.PI / 180, 0],
      fov: field,
    }), position, yaw, pitch, fov)
    await page.waitForFunction(() => {
      const snapshot = globalThis.slopGallery!.snapshot!()
      return snapshot.pendingPipelines === 0 && snapshot.pendingImages === 0
    }, {timeout: 120_000})
    await waitForFrames(page, 30)
    const frame = await page.evaluate(() => globalThis.slopGallery!.captureFrame!())
    expect(frame.nonBlackFraction).toBeGreaterThan(0.8)
    await Bun.write(`out/lobby/${name}.png`, Uint8Array.fromBase64(frame.dataUrl.split(',')[1]))
  }
  await capture('overview-heavy', [5, 1.7, 5], 12, 27)
  await capture('entry-heavy', [-5, 1.7, -29], -168, 30)
  await capture('sun-through-glass', [5, 1.7, -21], 143.13, 60.95, 55)
  await capture('carvings', [0, 5, -12], 0, 75, 75)
  await capture('from-dine', [12, 1.7, 3], 90, 15)
  await capture('from-oculus', [0, -9.3, -20], 0, 70, 75)
  for (const mode of ['fast', 'heavy']) {
    await page.click('button[aria-label="Heavy graphics"]')
    await page.waitForFunction(heavy => document.querySelector('button[aria-label="Heavy graphics"]')?.getAttribute('aria-pressed') === String(heavy), {}, mode === 'heavy')
    await capture(`overview-${mode}-switched`, [5, 1.7, 5], 12, 27)
  }
  // Dropping the real player through the old ceiling elevation must land on the Lobby floor, not an invisible 5.75 m slab.
  await page.click('#enter-gallery')
  await page.waitForFunction(() => !!document.pointerLockElement)
  await page.evaluate(() => globalThis.slopGallery!.teleport!([4.7, 8.6, -16], [0, 0, 0, 1]))
  await page.waitForFunction(() => {
    const player = globalThis.slopGallery!.player
    return player?.grounded && player.position.y < 0.1
  }, {timeout: 30_000})
  expect(await page.evaluate(() => globalThis.slopGallery!.player!.position.y)).toBeCloseTo(0.02, 1)
  expect(errors).toEqual([])
}, 300_000)
