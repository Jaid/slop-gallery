import type {previewOutputProbe} from './lib/previewOutputProbe.ts'

import {expect, test} from 'bun:test'

import {NoColorSpace, UnsignedByteType} from 'three/webgpu'

import {createOutputTarget} from '../scripts/lib/createOutputTarget.ts'
import withPreviewRenderer from '../scripts/lib/withPreviewRenderer.ts'

test('output byte targets never add a hardware sRGB transfer to the renderer output pass', () => {
  for (const size of [[512, 512], [3840, 2160], [4096, 4096], [2048, 2048]]) {
    const target = createOutputTarget(size[0], size[1])
    try {
      expect(target.texture.colorSpace).toBe(NoColorSpace)
      expect(target.texture.type).toBe(UnsignedByteType)
      expect(target.samples).toBe(4)
      expect([target.width, target.height]).toEqual(size)
    } finally {
      target.dispose()
    }
  }
})
// Opt in to a private headless browser; never attach to the interactive gallery.
test.skipIf(Bun.env.KNOT_TEST_GPU !== '1')('GPU readback encodes display RGB exactly once, including the ACES preview path', async () => {
  const result = await withPreviewRenderer(handle => handle.evaluate(async () => {
    const moduleURL = new URL('../test/lib/previewOutputProbe.ts', location.href).href
    const {previewOutputProbe} = await import(/* @vite-ignore */ moduleURL)
    return previewOutputProbe() as ReturnType<typeof import('./lib/previewOutputProbe.ts').previewOutputProbe>
  }))
  for (const {value, bytes} of result.samples) {
    const expected = Math.round(255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055))
    for (const channel of bytes.slice(0, 3)) {
      expect(Math.abs(channel - expected)).toBeLessThanOrEqual(1)
    }
    expect(bytes[3]).toBe(255)
  }
  expect(result.aces[0]).toBeGreaterThanOrEqual(85)
  expect(result.aces[0]).toBeLessThanOrEqual(89)
  expect(result.aces[1]).toBeGreaterThan(150)
  console.info('Preview output calibration:', JSON.stringify(result))
}, 60_000)
