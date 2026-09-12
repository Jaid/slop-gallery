import {expect, test} from 'bun:test'

import {visibleBounds} from '../../scripts/lib/knots/previewLayout.ts'

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
