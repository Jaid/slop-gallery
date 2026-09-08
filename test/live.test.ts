import type {Page} from 'puppeteer-core'

import {expect, test} from 'bun:test'
import {mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'

import puppeteer from 'puppeteer-core'
import {preview} from 'vite'

type Snapshot = {
  active: string | null
  activeLabel: string | null
  camera: Array<number>
  hasControlled: boolean
  held: string | null
  locked: boolean
  placement: {reason: string
    valid: boolean} | null
  portraits: Array<{height: number
    hung: boolean
    id: string
    merging: boolean
    position: Array<number>
    reserved: boolean
    title: string
    width: number}>
  props: Array<{id: string; position: {x: number; y: number; z: number}; bodyType: number; collidersEnabled: boolean[]; sleeping: boolean; visualPosition: number[]}>
  webGPU: boolean
  ready: boolean
  room: string
  rotation: Array<number | string>
  saveStatus: string
}
const snapshot = (page: Page): Promise<Snapshot> => page.evaluate(() => (globalThis.__gallery!.snapshot as () => Snapshot)())
const teleport = (page: Page, position: Array<number>, rotation = [0, 0, 0, 1]) => page.evaluate((position, rotation) => (globalThis.__gallery!.teleport as Function)(position, rotation), position, rotation)
const enter = async (page: Page) => {
  await page.waitForSelector('#enter-gallery')
  await page.click('#enter-gallery')
  await page.waitForFunction(() => !!document.pointerLockElement)
}
const history = async (page: Page, redo = false) => {
  await page.keyboard.down('Control')
  await page.keyboard.press(redo ? 'y' : 'z')
  await page.keyboard.up('Control')
}
const clickText = async (page: Page, text: string) => {
  const button = await page.waitForSelector(`xpath/.//button[starts-with(normalize-space(.), "${text}")]`)
  await button!.click()
}
test('production gallery: visible WebGPU, physics, editing, imports, fusion and persistence', async () => {
  const server = await preview({
    preview: {
      host: '127.0.0.1',
      port: 5187,
      strictPort: false,
    },
  })
  const browser = await puppeteer.launch({
    executablePath: Bun.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    defaultViewport: {
      width: 1440,
      height: 1000,
    },
    args: ['--enable-unsafe-webgpu'],
  })
  const errors: Array<string> = []
  const external: Array<string> = []
  const page = await browser.newPage()
  const baseUrl = server.resolvedUrls!.local[0]!
  try {
    page.on('pageerror', error => errors.push(String(error)))
    page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(message.text())
      }
    })
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && !request.url().startsWith(baseUrl)) {
        external.push(request.url())
      }
    })
    await page.goto(`${baseUrl}?ai=false&test=true`, {waitUntil: 'networkidle0'})
    await page.waitForFunction(() => (globalThis.__gallery?.snapshot as (() => Snapshot) | undefined)?.().ready, {timeout: 60_000})
    await page.evaluate(() => document.fonts.ready)
    await mkdir('private/agent/reports', {recursive: true})
    expect((await snapshot(page)).locked).toBe(false)
    expect((await snapshot(page)).hasControlled).toBe(false)
    expect(await page.$('.menu-overlay')).not.toBeNull()
    expect(await page.$('.menu-reset')).toBeNull()
    expect(await page.$('.connection[open]')).toBeNull()
    await page.screenshot({path: 'private/agent/reports/production-welcome.png'})
    await page.click('[aria-label="Mute audio"]')
    await enter(page)
    expect((await snapshot(page)).hasControlled).toBe(false)
    expect(await page.$('.menu-overlay')).toBeNull()
    expect(await page.$('header, footer, .artwork-overlay, .room-label')).toBeNull()
    const screenshot = await page.screenshot({path: 'private/agent/reports/production-gallery.png'})
    // Test the composited browser screenshot, not just a nonblack GPU readback.
    const variance = await page.evaluate(async encoded => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob())
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d')!
      context.drawImage(bitmap, 0, 0)
      bitmap.close()
      const pixels = context.getImageData(655, 395, 125, 125).data
      const values = Array.from({length: pixels.length / 4}, (_, i) => pixels[i * 4]!)
      const mean = values.reduce((a, b) => a + b) / values.length
      return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
    }, Buffer.from(screenshot).toString('base64'))
    expect(variance).toBeGreaterThan(500)
    expect((await snapshot(page)).webGPU).toBe(true)
    expect((await snapshot(page)).portraits).toHaveLength(16)
    const z = (await snapshot(page)).camera[2]!
    await page.keyboard.down('w')
    await Bun.sleep(350)
    await page.keyboard.up('w')
    expect((await snapshot(page)).camera[2]!).toBeLessThan(z - 0.3)
    expect((await snapshot(page)).hasControlled).toBe(true)
    const rotation = (await snapshot(page)).rotation
    await page.mouse.move(820, 460)
    await page.waitForFunction(before => JSON.stringify((globalThis.__gallery!.snapshot as () => Snapshot)().rotation) !== JSON.stringify(before), {}, rotation)
    const lookingAtPlate = Math.atan2(1.105 - 1.62, 3.28)
    await teleport(page, [-3.6, 1.62, -4.5], [Math.sin(lookingAtPlate / 2), 0, 0, Math.cos(lookingAtPlate / 2)])
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().activeLabel === 'goose')
    expect(await page.$eval('.artwork-overlay', element => element.textContent)).toContain('His Unbothered Majesty')
    expect(await page.$eval('.artwork-overlay', element => element.textContent)).toContain('Cornelius van Honk')
    expect(await page.$eval('.artwork-overlay', element => element.textContent)).toContain('Undated')
    const lookingUp = [Math.sin(0.13), 0, 0, Math.cos(0.13)]
    await teleport(page, [-3.6, 1.62, -4.5], lookingUp)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().active === 'goose')
    expect((await snapshot(page)).activeLabel).toBeNull()
    expect(await page.$('.artwork-overlay')).toBeNull()
    await page.keyboard.press('e')
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().held === 'goose')
    await teleport(page, [-6.3, 1.62, -4.5], lookingUp)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().placement?.valid && Math.abs((globalThis.__gallery!.snapshot as () => Snapshot)().camera[0]! + 6.3) < 0.01)
    await page.keyboard.press('e')
    expect((await snapshot(page)).portraits.find(p => p.id === 'goose')!.position[0]).toBeCloseTo(-6.3)
    await page.keyboard.down('Control')
    await page.keyboard.press('z')
    await page.keyboard.up('Control')
    expect((await snapshot(page)).portraits.find(p => p.id === 'goose')!.position[0]).toBe(-3.6)
    // A low wall target is invalid; dropping must leave the original untouched.
    await teleport(page, [-3.6, 1.62, -4.5], lookingUp)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().active === 'goose')
    await page.keyboard.press('e')
    await teleport(page, [-3.6, 1.62, -4.5])
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().placement?.valid === false)
    await page.keyboard.press('e')
    expect((await snapshot(page)).portraits.find(p => p.id === 'goose')!.position).toEqual([-3.6, 2.5, -7.78])
    await teleport(page, [-3.6, 1.62, -4.5], lookingUp)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().active === 'goose')
    await page.mouse.down({button: 'left'})
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().held === 'goose')
    await page.mouse.down({button: 'right'})
    await page.mouse.up({button: 'right'})
    await page.mouse.up({button: 'left'})
    expect((await snapshot(page)).portraits.find(p => p.id === 'goose')!.hung).toBe(false)
    await page.keyboard.down('Control')
    await page.keyboard.press('z')
    await page.keyboard.up('Control')
    expect((await snapshot(page)).portraits.find(p => p.id === 'goose')!.hung).toBe(true)
    await page.evaluate(() => document.exitPointerLock())
    await page.click('[aria-label="Open collection"]')
    await page.waitForSelector('dialog[open]')
    expect(await page.$$eval('.art-card', cards => cards.length)).toBe(16)
    await page.type('[aria-label="Search collection"]', 'Cosmic Inconvenience')
    expect(await page.$$eval('.art-card', cards => cards.length)).toBe(1)
    await page.click('.art-image')
    await clickText(page, 'Edit label')
    await page.focus('.art-detail form input')
    await page.keyboard.down('Control')
    await page.keyboard.press('a')
    await page.keyboard.up('Control')
    await page.keyboard.type('A tested masterpiece')
    await clickText(page, 'Save label')
    expect((await snapshot(page)).portraits.find(p => p.id === 'cat')!.title).toBe('A tested masterpiece')
    await page.screenshot({path: 'private/agent/reports/production-detail.png'})
    await page.keyboard.press('Escape')
    await page.waitForSelector('dialog', {hidden: true})
    const image = await page.evaluate(async () => {
      const canvas = new OffscreenCanvas(600, 300)
      const context = canvas.getContext('2d')!
      context.fillStyle = '#dc472e'
      context.fillRect(0, 0, 600, 300)
      context.fillStyle = '#244746'
      context.fillRect(100, 50, 300, 200)
      return new Uint8Array(await (await canvas.convertToBlob({type: 'image/png'})).arrayBuffer()).toBase64()
    })
    await Bun.write('private/agent/reports/import-fixture.png', Buffer.from(image, 'base64'))
    await teleport(page, [0, 1.62, 4])
    const input = await page.$('input[data-artwork-input]')
    await input!.uploadFile(`${process.cwd()}/private/agent/reports/import-fixture.png`)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().portraits.length === 16)
    const imported = (await snapshot(page)).portraits.find(p => p.title === 'import fixture')!
    expect(imported.width / imported.height).toBe(2)
    expect(imported.hung).toBe(false)
    await page.evaluate((id: string) => (globalThis.__gallery!.merge as Function)('orange', id), imported.id)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().portraits.find(p => p.id === 'orange')?.merging)
    expect((await snapshot(page)).portraits).toHaveLength(16)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().portraits.find(p => p.id === 'orange')?.title === 'An unexpected collaboration')
    expect((await snapshot(page)).portraits).toHaveLength(16)
    await history(page)
    expect((await snapshot(page)).portraits).toHaveLength(16)
    await history(page, true)
    expect((await snapshot(page)).portraits).toHaveLength(16)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().saveStatus === 'saved')
    await Bun.sleep(700)
    await page.reload({waitUntil: 'networkidle0'})
    await page.waitForFunction(() => (globalThis.__gallery?.snapshot as (() => Snapshot) | undefined)?.().ready)
    expect((await snapshot(page)).portraits.find(p => p.id === 'cat')!.title).toBe('A tested masterpiece')
    expect((await snapshot(page)).portraits.find(p => p.id === 'orange')!.title).toBe('An unexpected collaboration')
    const downloadPath = resolve(`private/agent/reports/downloads-${Date.now()}`)
    await mkdir(downloadPath, {recursive: true})
    const client = await browser.target().createCDPSession()
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath,
      eventsEnabled: true,
    })
    await page.click('[aria-label="Gallery settings"]')
    await clickText(page, 'Export collection')
    const backupName = `slop-gallery-${(new Date).toISOString().slice(0, 10)}.slop`
    const backupPath = `${downloadPath}/${backupName}`
    for (let i = 0; i < 100 && !await Bun.file(backupPath).exists(); i++) {
      await Bun.sleep(50)
    }
    const backup = JSON.parse(await new Response(Bun.file(backupPath).stream().pipeThrough(new DecompressionStream('gzip'))).text())
    expect(backup.version).toBe(1)
    expect(backup.portraits).toHaveLength(16)
    expect(backup.portraits.find((p: {id: string}) => p.id === 'orange').source.mime).toBe('image/webp')
    expect(backup).not.toHaveProperty('apiKey')
    await page.keyboard.press('Escape')
    await clickText(page, 'Reset gallery')
    await clickText(page, 'Confirm reset')
    expect((await snapshot(page)).portraits.find(p => p.id === 'orange')!.title).toBe('A Slightly Larger Tomorrow')
    await page.click('[aria-label="Gallery settings"]')
    await (await page.$('input[aria-label="Restore gallery backup"]'))!.uploadFile(backupPath)
    await page.waitForSelector('.confirmation')
    await clickText(page, 'Restore collection')
    expect((await snapshot(page)).portraits.find(p => p.id === 'orange')!.title).toBe('An unexpected collaboration')
    await page.keyboard.press('Escape')
    await teleport(page, [-6.3, 1.62, -4.5], lookingUp)
    await page.waitForFunction(() => Math.abs((globalThis.__gallery!.snapshot as () => Snapshot)().camera[0]! + 6.3) < 0.01)
    const drag = (type: string, offset = 0) => page.evaluate((type, encoded, offset) => {
      const file = new File([Uint8Array.fromBase64(encoded)], 'dropped fixture.png', {type: 'image/png'})
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      const canvas = document.querySelector('canvas')!, bounds = canvas.getBoundingClientRect()
      canvas.dispatchEvent(new DragEvent(type, {dataTransfer, bubbles: true, cancelable: true, clientX: bounds.left + bounds.width / 2 + offset, clientY: bounds.top + bounds.height / 2}))
    }, type, image, offset)
    await drag('dragenter')
    await page.waitForSelector('.drop-overlay')
    await drag('dragover')
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().placement?.valid)
    // Deliberately change the final drop coordinate without another preview frame.
    await drag('drop', -10)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().portraits.length === 16)
    const dropped = (await snapshot(page)).portraits.find(p => p.title === 'dropped fixture')!
    expect(dropped.hung).toBe(true)
    expect(dropped.position[0]!).toBeLessThan(-6.32)
    await history(page)
    await page.evaluate(encoded => {
      const clipboardData = new DataTransfer()
      clipboardData.items.add(new File([Uint8Array.fromBase64(encoded)], 'pasted fixture.png', {type: 'image/png'}))
      document.body.dispatchEvent(new ClipboardEvent('paste', {clipboardData, bubbles: true, cancelable: true}))
    }, image)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().portraits.length === 16)
    expect((await snapshot(page)).portraits.some(p => p.title === 'pasted fixture')).toBe(true)
    await history(page)
    for (const [x, room] of [[-14, 'cabinet'], [14, 'afterhours']] as const) {
      await teleport(page, [x, 1.62, 3])
      await page.waitForFunction(room => (globalThis.__gallery!.snapshot as () => Snapshot)().room === room, {}, room)
      await page.screenshot({path: `private/agent/reports/production-${room}.png`})
    }
    // Walk through both boolean-cut portals from both sides, including near a jamb.
    for (const side of [-1, 1]) {
      for (const returning of [false, true]) {
        const x = side * (returning ? 9.4 : 6.6)
        const yaw = side * (returning ? Math.PI / 2 : -Math.PI / 2)
        await teleport(page, [x, 1.62, 3.7], [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)])
        await page.waitForSelector('#enter-gallery')
        await enter(page)
        await page.waitForFunction(() => !!document.pointerLockElement)
        await page.keyboard.down('w')
        await page.waitForFunction(({side, returning}) => {
          const x = (globalThis.__gallery!.snapshot as () => Snapshot)().camera[0]!
          return returning ? Math.abs(x) < 7.4 : x * side > 8.6
        }, {timeout: 8000}, {side, returning})
        await page.keyboard.up('w')
        expect((await snapshot(page)).camera[1]).toBeCloseTo(1.62, 1)
        await page.evaluate(() => document.exitPointerLock())
      }
    }
    // Carried sculptures must never become moving platforms for the character controller.
    await teleport(page, [13.3, 1.62, 3.5], [Math.sin(0.07), 0, 0, Math.cos(0.07)])
    await enter(page)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().active === 'prop-knot')
    await page.keyboard.press('e')
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().held === 'prop-knot')
    for (const [position, rotation] of [
      [[19.45, 1.62, 3], [0, -Math.SQRT1_2, 0, Math.SQRT1_2]],
      [[16, 1.62, 3], [-Math.sin(0.65), 0, 0, Math.cos(0.65)]],
      [[18, 1.62, 7.45], [0, 1, 0, 0]],
    ]) {
      await teleport(page, position!, rotation!)
      await Bun.sleep(1000)
      const state = await snapshot(page)
      expect(Math.hypot(...state.camera.map((value, axis) => value - position![axis]!))).toBeLessThan(0.05)
      const knot = state.props.find(prop => prop.id === 'prop-knot')!
      expect(knot.bodyType).toBe(1)
      expect(knot.collidersEnabled.length).toBeGreaterThan(0)
      expect(knot.collidersEnabled.every(enabled => !enabled)).toBe(true)
    }
    await page.keyboard.press('e')
    await Bun.sleep(500)
    const released = await snapshot(page)
    expect(Math.hypot(...released.camera.map((value, axis) => value - [18, 1.62, 7.45][axis]!))).toBeLessThan(0.05)
    expect(released.props.find(prop => prop.id === 'prop-knot')!.bodyType).toBe(0)
    expect(released.props.find(prop => prop.id === 'prop-knot')!.collidersEnabled.every(Boolean)).toBe(true)
    expect(released.props.find(prop => prop.id === 'prop-knot')!.position.z).toBeLessThan(7)
    await teleport(page, [13.3, 1.62, 3.5], [Math.sin(0.07), 0, 0, Math.cos(0.07)])
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().active === 'prop-knot')
    await page.keyboard.press('e')
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().held === 'prop-knot')
    const beforeThrow = (await snapshot(page)).props.find(prop => prop.id === 'prop-knot')!.position
    await page.keyboard.press('q')
    await Bun.sleep(400)
    const thrown = (await snapshot(page)).props.find(prop => prop.id === 'prop-knot')!
    expect(thrown.bodyType).toBe(0)
    expect(thrown.collidersEnabled.every(Boolean)).toBe(true)
    expect(Math.hypot(thrown.position.x - beforeThrow.x, thrown.position.y - beforeThrow.y, thrown.position.z - beforeThrow.z)).toBeGreaterThan(0.2)
    await page.evaluate(() => document.exitPointerLock())
    // The rear room is accessible without touching the book.
    await teleport(page, [0, 1.62, 6], [0, 1, 0, 0])
    await enter(page)
    await page.keyboard.down('w')
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().room === 'secret')
    await page.keyboard.up('w')
    await page.evaluate(() => document.exitPointerLock())
    await page.screenshot({path: 'private/agent/reports/production-good-taste.png'})
    await enter(page)
    // The book sits below eye level; look down toward the pedestal.
    await teleport(page, [-3.2, 1.62, 5.2], [0, Math.cos(0.07), Math.sin(0.07), 0])
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().active === 'prop-book')
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().props.find(prop => prop.id === 'prop-book')?.sleeping)
    await page.mouse.down({button: 'left'})
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().held === 'prop-book')
    await teleport(page, [-3.2, 1.62, 4.2], [0, 1, 0, 0])
    await Bun.sleep(350)
    const heldBook = (await snapshot(page)).props.find(prop => prop.id === 'prop-book')!
    expect((await snapshot(page)).held).toBe('prop-book')
    expect(heldBook.sleeping).toBe(false)
    expect(heldBook.bodyType).toBe(1)
    expect(heldBook.collidersEnabled.every(enabled => !enabled)).toBe(true)
    expect(heldBook.visualPosition[2]).toBeCloseTo(5.65, 1)
    expect(Math.hypot(...heldBook.visualPosition.map((value, i) => value - [heldBook.position.x, heldBook.position.y, heldBook.position.z][i]!))).toBeLessThan(0.03)
    await page.mouse.up({button: 'left'})
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().held === null)
    expect((await snapshot(page)).props.find(prop => prop.id === 'prop-book')!.bodyType).toBe(0)
    // Re-grab the fallen book with E, then verify that cancel still restores its pose.
    await teleport(page, [-3.2, 1.62, 4.2], [0, Math.cos(0.4), Math.sin(0.4), 0])
    await Bun.sleep(1200)
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().active === 'prop-book')
    await page.keyboard.press('e')
    await page.waitForFunction(() => (globalThis.__gallery!.snapshot as () => Snapshot)().held === 'prop-book')
    await page.evaluate(() => document.exitPointerLock())
    expect((await snapshot(page)).held).toBeNull()
    const canceledBook = (await snapshot(page)).props.find(prop => prop.id === 'prop-book')!
    expect(canceledBook.bodyType).toBe(0)
    expect(canceledBook.collidersEnabled.every(Boolean)).toBe(true)
    await page.click('[aria-label="Lightweight graphics"]')
    await page.waitForFunction(() => location.search.includes('lite=true'))
    await page.screenshot({path: 'private/agent/reports/production-lite.png'})
    const captures = await page.evaluate(async () => {
      const [a, b] = await Promise.all([globalThis.__gallery!.captureFrame!(), globalThis.__gallery!.captureFrame!()])
      return [a.width, b.width, a.nonBlackFraction]
    })
    expect(captures[0]).toBe(1440)
    expect(captures[1]).toBe(1440)
    expect(captures[2]).toBeGreaterThan(0.9)
    await page.setViewport({width: 760, height: 900})
    const muted = await page.$eval('[aria-label="Mute audio"]', button => button.getAttribute('aria-pressed'))
    await page.click('[aria-label="Open collection"]')
    await page.waitForSelector('dialog[open]')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true)
    await page.keyboard.press('m')
    await page.screenshot({path: 'private/agent/reports/production-narrow.png'})
    await page.keyboard.press('Escape')
    expect(await page.$eval('[aria-label="Mute audio"]', button => button.getAttribute('aria-pressed'))).toBe(muted)
    const fallback = await browser.newPage()
    await fallback.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'gpu', {value: undefined}))
    await fallback.goto(`${baseUrl}?ai=false`, {waitUntil: 'networkidle0'})
    expect(await fallback.$eval('.render-error', element => element.textContent)).toContain('WebGPU is unavailable')
    await fallback.click('[aria-label="Open collection"]')
    expect(await fallback.$$eval('.art-card', cards => cards.length)).toBeGreaterThan(0)
    await fallback.close()
    expect(external).toEqual([])
    expect(errors).toEqual([])
  } catch (error) {
    await page.screenshot({path: 'private/agent/reports/live-failure.png'})
    console.log(await snapshot(page), await page.$eval('body', b => b.innerText))
    throw error
  } finally {
    await browser.close()
    await new Promise<void>((resolve, reject) => server.httpServer.close(error => (error ? reject(error) : resolve())))
  }
}, 180_000)
