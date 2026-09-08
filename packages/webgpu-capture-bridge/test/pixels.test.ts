import {describe, expect, test} from 'bun:test'

import {analyzeFrame, unpackRgba} from '../src/pixels.ts'

describe('RGBA8 readback', () => {
  for (const width of [1, 63, 64, 65, 127, 128, 129]) {
    for (const height of [1, 2, 3]) {
      for (const layout of ['packed', 'padded-final-row', 'unpadded-final-row']) {
        test(`unpacks ${width}×${height} ${layout} without flipping or retaining padding`, () => {
          const rowBytes = width * 4
          const stride = layout === 'packed' ? rowBytes : Math.ceil(rowBytes / 256) * 256
          const length = layout === 'unpadded-final-row' ? stride * (height - 1) + rowBytes : stride * height
          const input = new Uint8Array(length).fill(255)
          const expected = new Uint8ClampedArray(rowBytes * height)
          for (let y = 0; y < height; y += 1) {
            const row = Uint8Array.from({length: rowBytes}, (_, x) => (x + y * 17) % 251)
            input.set(row, stride * y)
            expected.set(row, rowBytes * y)
          }
          const result = unpackRgba(input, width, height)
          expect(result.pixels).toEqual(expected)
          expect([result.width, result.height]).toEqual([width, height])
          input.fill(0)
          expect(result.pixels).toEqual(expected)
        })
      }
    }
  }
  test('rejects truncated, ambiguous and oversized layouts', () => {
    for (const length of [0, 7, 9, 259, 261, 511, 513]) {
      expect(() => unpackRgba(new Uint8Array(length), 1, 2)).toThrow('Unexpected WebGPU readback size')
    }
  })
  test('rejects invalid dimensions before allocating', () => {
    for (const dimension of [-1, 0, 0.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
      expect(() => unpackRgba(new Uint8Array, dimension, 1)).toThrow('Invalid capture size')
      expect(() => unpackRgba(new Uint8Array, 1, dimension)).toThrow('Invalid capture size')
    }
  })
  test('keeps the original diagnostic threshold and byte-based luminance semantics', () => {
    const frame = unpackRgba(new Uint8Array([
      8,
      8,
      8,
      255,
      9,
      0,
      0,
      0,
      0,
      9,
      0,
      128,
      0,
      0,
      9,
      64,
    ]), 2, 2)
    const result = analyzeFrame(frame)
    expect(result.centerPixel).toEqual([0, 0, 9, 64])
    expect(result.nonBlackFraction).toBe(0.75)
    expect(result.meanLuminance).toBeCloseTo((8 + 9) / 4)
  })
})
