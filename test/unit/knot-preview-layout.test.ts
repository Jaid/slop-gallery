import {expect, test} from 'bun:test'

import {previewTileRect, visibleBounds} from '../../scripts/lib/knots/previewLayout.ts'

test('crops by alpha, preserving faint edge pixels and ignoring invisible RGB', () => {
  const data = new Uint8ClampedArray(6 * 5 * 4)
  data[0] = 255
  data[(1 * 6 + 2) * 4 + 3] = 1
  data[(3 * 6 + 4) * 4 + 3] = 255
  expect(visibleBounds({
    data,
    width: 6,
    height: 5,
  })).toEqual([2, 1, 3, 3])
  expect(visibleBounds({
    data: new Uint8ClampedArray(24),
    width: 3,
    height: 2,
  })).toBeUndefined()
  expect(visibleBounds({
    data: new Uint8ClampedArray([0, 0, 0, 255]),
    width: 1,
    height: 1,
  })).toEqual([0, 0, 1, 1])
})
test('contains differently cropped icons in square tiles without stretching or spilling into captions', () => {
  for (const [width, height] of [[200, 400], [400, 200], [640, 640], [1, 100]]) {
    const [x, y, w, h] = previewTileRect(width, height, 320)
    expect(w / h).toBeCloseTo(width / height)
    expect(x + w / 2).toBeCloseTo(160)
    expect(y + h / 2).toBeCloseTo(160)
    expect(x).toBeGreaterThanOrEqual(12)
    expect(y).toBeGreaterThanOrEqual(12)
    expect(x + w).toBeLessThanOrEqual(308)
    expect(y + h).toBeLessThanOrEqual(308)
    expect(Math.max(w, h)).toBeCloseTo(296)
  }
})
