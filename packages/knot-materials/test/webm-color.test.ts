import {expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import fs from 'fs-extra'
import puppeteer from 'puppeteer-core'

import {encodeWebm} from '../scripts/lib/encodeAnimation.ts'
import {animationFilename} from '../scripts/lib/renderSettings.ts'

const {mkdtemp, readFile, rm, writeFile} = fs
// Flat interiors avoid measuring 4:2:0 edge blending as a color-conversion error.
const swatches = [
  [0, 0, 0],
  [4, 4, 4],
  [8, 8, 8],
  [16, 16, 16],
  [32, 32, 32],
  [64, 64, 64],
  [96, 96, 96],
  [128, 128, 128],
  [192, 192, 192],
  [235, 235, 235],
  [255, 255, 255],
  [220, 40, 40],
  [40, 220, 40],
  [40, 40, 220],
  [40, 220, 220],
  [220, 40, 220],
  [220, 220, 40],
  [180, 120, 60],
  [60, 120, 180],
  [90, 100, 110],
]
const browserTest = Bun.env.KNOT_TEST_BROWSER === '1' || Bun.env.KNOT_TEST_GPU === '1'
test.skipIf(!browserTest)('browser-decoded AV1/WebM preserves sRGB swatches and near-black detail', async () => {
  if (!Bun.which('ffmpeg')) {
    throw new Error('The WebM color regression requires FFmpeg with libsvtav1.')
  }
  const folder = await mkdtemp(join(tmpdir(), 'knot-webm-color-'))
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined
  try {
    browser = await puppeteer.launch({
      executablePath: Bun.env.BROWSER,
      headless: true,
    })
    const page = await browser.newPage()
    const source = await page.evaluate(colors => {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 256
      const context = canvas.getContext('2d', {
        colorSpace: 'srgb',
        willReadFrequently: true,
      })!
      for (const [index, rgb] of colors.entries()) {
        context.fillStyle = `rgb(${rgb.join(',')})`
        context.fillRect(index % 5 * 64, Math.floor(index / 5) * 64, 64, 64)
      }
      return {
        png: canvas.toDataURL('image/png').split(',')[1],
        samples: colors.map((_, index) => [...context.getImageData(index % 5 * 64 + 32, Math.floor(index / 5) * 64 + 32, 1, 1).data].slice(0, 3)),
      }
    }, swatches)
    expect(source.samples).toEqual(swatches)
    const frameCount = 6
    const pixels = Uint8Array.fromBase64(source.png)
    await Promise.all(Array.from({length: frameCount}, (_, index) => writeFile(join(folder, animationFilename(index)), pixels)))
    const output = await encodeWebm(folder, {frameCount})
    const videoBytes = await readFile(output)
    const encoded = videoBytes.toBase64()
    const decoded = await page.evaluate(async ({base64, count}) => {
      const video = document.createElement('video')
      video.muted = true
      video.preload = 'auto'
      document.body.append(video)
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timed out decoding the WebM color probe.')), 10_000)
          video.addEventListener('loadeddata', () => {
            clearTimeout(timeout)
            resolve()
          })
          video.addEventListener('error', () => {
            clearTimeout(timeout)
            reject(new Error(video.error?.message ?? 'WebM decoding failed.'))
          }, {once: true})
          video.src = `data:video/webm;base64,${base64}`
        })
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timed out presenting the WebM color probe.')), 10_000)
          video.requestVideoFrameCallback(() => {
            clearTimeout(timeout)
            resolve()
          })
          void video.play().catch(error => {
            clearTimeout(timeout)
            reject(error)
          })
        })
        video.pause()
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const context = canvas.getContext('2d', {
          colorSpace: 'srgb',
          willReadFrequently: true,
        })!
        context.drawImage(video, 0, 0)
        return Array.from({length: count}, (_, index) => [...context.getImageData(index % 5 * 64 + 32, Math.floor(index / 5) * 64 + 32, 1, 1).data].slice(0, 3))
      } finally {
        video.removeAttribute('src')
        video.load()
        video.remove()
      }
    }, {
      base64: encoded,
      count: swatches.length,
    })
    const errors = decoded.flatMap((rgb, index) => rgb.map((value, channel) => Math.abs(value - swatches[index][channel])))
    const maxError = Math.max(...errors)
    console.info('WebM browser color calibration:', JSON.stringify({
      browser: await browser.version(),
      maxError,
      nearBlack: decoded[3],
      decoded,
    }))
    // Allow small lossy/rounding differences without accepting a range or matrix mismatch.
    expect(maxError).toBeLessThanOrEqual(3)
  } finally {
    try {
      await browser?.close()
    } finally {
      await rm(folder, {
        recursive: true,
        force: true,
      })
    }
  }
}, 60_000)
