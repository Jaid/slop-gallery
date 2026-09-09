/* eslint-disable no-underscore-dangle, typescript/no-restricted-imports -- Use the existing diagnostics API and native mkdir for browser-test output. */
import type {AimSnapshot} from '../src/lib/development/AimInspector.ts'

import {expect, test} from 'bun:test'
import {mkdir} from 'node:fs/promises'

import puppeteer from 'puppeteer-core'
import {preview} from 'vite'

import {plantCombinations} from '../src/lib/gallery/plantDecorations/catalog.ts'

test('all 32 botanical pairs and numbered signs render in full and lightweight WebGPU', async () => {
  const server = await preview({
    preview: {
      host: '127.0.0.1',
      port: 5192,
      strictPort: false,
    },
  })
  const browser = await puppeteer.launch({
    executablePath: Bun.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    defaultViewport: {
      width: 1600,
      height: 1000,
    },
    args: ['--enable-unsafe-webgpu'],
  })
  const page = await browser.newPage()
  const errors: Array<string> = []
  page.on('pageerror', error => errors.push(String(error)))
  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  const base = server.resolvedUrls!.local[0]!
  try {
    await mkdir('private/agent/reports', {recursive: true})
    for (const lite of [false, true]) {
      await page.goto(`${base}?ai=false&telemetry=false&test=true&development=true&lite=${lite}`, {waitUntil: 'domcontentloaded'})
      await page.waitForFunction(() => globalThis.__gallery?.snapshot?.().ready, {timeout: 60_000})
      for (const combination of plantCombinations) {
        const aim: AimSnapshot = await page.evaluate(({position}) => {
          const pitch = Math.atan2(0.22 - 1.62, 1.7 - 0.64)
          globalThis.__gallery!.teleport!([position[0], 1.62, position[2] + 1.7], [Math.sin(pitch / 2), 0, 0, Math.cos(pitch / 2)])
          return window['slop.gallery']!.getAim()
        }, combination)
        expect(aim.hit?.mesh.name).toBe(`number-sign-${combination.number}`)
        const metadata = aim.hit?.ancestors.find(ancestor => ancestor.metadata.combination === combination.number)?.metadata
        expect(metadata?.pot).toBe(combination.pot)
        expect(metadata?.plant).toBe(combination.plant)
        const complexity = aim.hit!.mesh.metadata
        expect(complexity.potTriangles).toBeGreaterThan(0)
        expect(complexity.plantTriangles).toBeGreaterThan(0)
        expect(complexity.triangles).toBe(Number(complexity.potTriangles) + Number(complexity.plantTriangles))
      }
      await page.evaluate(() => globalThis.__gallery!.teleport!([0, 1.62, 5.8], [-Math.sin(0.12), 0, 0, Math.cos(0.12)]))
      const mute = await page.$('[aria-label="Mute audio"]')
      if (mute && await mute.evaluate(element => element.getAttribute('aria-pressed') !== 'true')) {
        await mute.click()
      }
      await page.click('#enter-gallery')
      await page.waitForFunction(() => !!document.pointerLockElement)
      const capture = await page.evaluate(async () => {
        const frame = await globalThis.__gallery!.captureFrame!()
        return {
          width: frame.width,
          nonBlackFraction: frame.nonBlackFraction,
        }
      })
      expect(capture.width).toBe(1600)
      expect(capture.nonBlackFraction).toBeGreaterThan(0.9)
      await page.screenshot({path: `private/agent/reports/plant-preview-${lite ? 'lite' : 'full'}.png`})
      expect(errors).toEqual([])
    }
    // Removing the installation also removes its signs, not just the visible pots.
    await page.goto(`${base}?ai=false&telemetry=false&test=true&development=true&plantPreview=false`, {waitUntil: 'domcontentloaded'})
    await page.waitForFunction(() => globalThis.__gallery?.snapshot?.().ready, {timeout: 60_000})
    const names = await page.evaluate(() => {
      globalThis.__gallery!.teleport!([0.825, 1.62, 4.8], [-Math.sin(0.46), 0, 0, Math.cos(0.46)])
      return window['slop.gallery']!.getAim().hits.flatMap(hit => [hit.mesh.name, ...hit.ancestors.map(ancestor => ancestor.name)])
    })
    expect(names).not.toContain('plant-combination-preview')
    expect(errors).toEqual([])
  } finally {
    await browser.close()
    await new Promise<void>((resolve, reject) => server.httpServer.close(error => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }))
  }
}, 180_000)
