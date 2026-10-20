import type {Vec3} from '../src/lib/gallery/types.ts'
import type {KeyInput} from 'puppeteer-core'

import {expect, test} from 'bun:test'

import {openHeadlessGallery, resolveGallerySetup, waitForFrames} from '../scripts/lib/headlessGallery.ts'

// Exercise the baked instanced seating, collider wiring and actual keyboard motor, not just the authoring meshes.
test.skipIf(Bun.env.LIVE_TEST !== 'true')('production Dine: both doorways, all four aisles and solid banquet furniture', async () => {
  const setup = await resolveGallerySetup({
    target: Bun.env.LIVE_TARGET ?? 'dist',
    seed: '1',
    graphics: 'fast',
    'anti-aliasing': 'false',
    width: '800',
    height: '450',
  })
  await using gallery = await openHeadlessGallery(setup, {cacheDir: 'node_modules/.vite-dine-walk'})
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
  const walk = async (key: KeyInput, axis: 'x' | 'z', target: number, greater: boolean) => {
    await page.keyboard.down(key)
    try {
      await page.waitForFunction((dimension, destination, increasing) => {
        const position = globalThis.slopGallery!.player?.position
        return position && (increasing ? position[dimension] > destination : position[dimension] < destination)
      }, {timeout: 30_000}, axis, target, greater)
    } finally {
      await page.keyboard.up(key)
    }
    await waitForFrames(page, 20)
    const player = await page.evaluate(() => globalThis.slopGallery!.player!)
    expect(player.grounded).toBe(true)
    expect(Math.abs(player.position.y - 0.02)).toBeLessThan(0.05)
  }
  // Lobby → west aisle → north cross-aisle → Salon, crossing both room portals on foot.
  await teleport([6, 1.7, 3])
  await walk('d', 'x', 10.7, true)
  await walk('w', 'z', -14, false)
  await walk('d', 'x', 14, true)
  await walk('w', 'z', -17.5, false)
  // Return through the north doorway, then walk the east and south aisles.
  await walk('s', 'z', -14, true)
  await walk('d', 'x', 17.3, true)
  await walk('s', 'z', 5.7, true)
  await walk('a', 'x', 14, false)
  await teleport([14, 1.7, 6])
  await page.keyboard.down('w')
  await new Promise(resolve => setTimeout(resolve, 1500))
  await page.keyboard.up('w')
  await waitForFrames(page, 20)
  const blocked = await page.evaluate(() => globalThis.slopGallery!.player!)
  expect(blocked.grounded).toBe(true)
  expect(blocked.position.z).toBeGreaterThan(4.1)
  expect(blocked.position.z).toBeLessThan(4.7)
  // Dropping onto an unoccupied patch of tabletop must land on the board, not fall through its visual mesh.
  await teleport([14.55, 3.4, -2.6])
  await waitForFrames(page, 90)
  const onTable = await page.evaluate(() => globalThis.slopGallery!.player!)
  expect(onTable.grounded).toBe(true)
  expect(Math.abs(onTable.position.y - 0.84)).toBeLessThan(0.04)
  expect(errors).toEqual([])
}, 180_000)
