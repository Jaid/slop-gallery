import type {Vec3} from '../src/lib/gallery/types.ts'
import type {KeyInput} from 'puppeteer-core'

import {expect, test} from 'bun:test'

import {openHeadlessGallery, resolveGallerySetup, waitForFrames} from '../scripts/lib/headlessGallery.ts'

// Separate from the collection/import smoke test: exercise the actual baked meshes, React collider wiring and keyboard motor.
test.skipIf(Bun.env.LIVE_TEST !== 'true')('production Oculus: inclined connection and two-flight switchbacks', async () => {
  const setup = await resolveGallerySetup({
    target: Bun.env.LIVE_TARGET ?? 'dist',
    seed: '1',
    graphics: 'fast',
    'anti-aliasing': 'false',
    width: '800',
    height: '450',
  })
  await using gallery = await openHeadlessGallery(setup, {cacheDir: 'node_modules/.vite-oculus-walk'})
  const {page} = gallery
  const errors: Array<string> = []
  page.on('pageerror', error => errors.push(String(error)))
  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  await page.click('#enter-gallery')
  await page.waitForFunction(() => !!document.pointerLockElement)
  const teleport = async (position: Vec3, rotation = [0, 0, 0, 1]) => {
    await page.evaluate((p, r) => globalThis.slopGallery!.teleport!(p, r), position, rotation)
    await waitForFrames(page, 30)
  }
  const walk = async (key: KeyInput, axis: 'x' | 'z', target: number, greater: boolean, expectedY: number) => {
    await page.keyboard.down(key)
    try {
      await page.waitForFunction((dimension, destination, increasing) => {
        const position = globalThis.slopGallery!.player?.position
        return position && (increasing ? position[dimension] > destination : position[dimension] < destination)
      }, {timeout: 40_000}, axis, target, greater)
    } finally {
      await page.keyboard.up(key)
    }
    await waitForFrames(page, 35)
    const player = await page.evaluate(() => globalThis.slopGallery!.player!)
    expect(player.grounded).toBe(true)
    expect(Math.abs(player.position.y - expectedY)).toBeLessThan(0.06)
  }
  // Moonfall → Oculus → Moonfall, crossing both sloped slab/portal junctions.
  await teleport([0, -6.38, 5.5])
  await walk('w', 'z', -11.5, false, -10.98)
  await teleport([0, -9.38, -11.5], [0, 1, 0, 0])
  await walk('w', 'z', 5.5, true, -7.98)
  // Climb the east switchback, including the flat lateral turn, then descend the west one.
  await teleport([5.7, -9.38, -25])
  await walk('s', 'z', -15.95, true, -7.98)
  await walk('d', 'x', 7.8, true, -7.98)
  await walk('w', 'z', -26.6, false, -4.98)
  await teleport([-7.9, -3.38, -26.8])
  await walk('s', 'z', -15.95, true, -7.98)
  await walk('d', 'x', -5.8, true, -7.98)
  await walk('w', 'z', -24.9, false, -10.98)
  expect(errors).toEqual([])
}, 180_000)
