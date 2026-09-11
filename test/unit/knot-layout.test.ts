import {expect, test} from 'bun:test'

import {KnotLayout} from '../../src/lib/knots/KnotLayout.ts'

test('room width follows the longest displayed row and depth follows creator count', () => {
  const one = new KnotLayout([1])
  const eight = new KnotLayout([8])
  const nine = new KnotLayout([8, 1, 3, 8, 17, 1, 8, 8, 8])
  expect(eight.size[0] - one.size[0]).toBe(7 * one.itemSpacing)
  expect(nine.size[0] - eight.size[0]).toBe(9 * one.itemSpacing)
  expect(nine.size[2] - eight.size[2]).toBe(8 * one.rowSpacing)
  expect(nine.size).toEqual([69.25, 5.8, 55])
  for (const layout of [one, eight, nine, new KnotLayout([])]) {
    expect(layout.previewX).toBeGreaterThan(layout.bounds.minX)
    expect(layout.rowHalfWidth).toBeLessThan(layout.bounds.maxX)
    expect(layout.center[0]).toBe((layout.bounds.minX + layout.bounds.maxX) / 2)
    expect(layout.center[2]).toBe((layout.bounds.northZ + layout.bounds.southZ) / 2)
  }
})
test('rejects invalid row sizes and left-aligns sparse rows', () => {
  for (const count of [0, -1, 0.5, Infinity, Number.NaN]) {
    expect(() => new KnotLayout([count])).toThrow()
  }
  const layout = new KnotLayout([1, 17])
  expect(layout.rowCenterX(1)).toBe(-layout.rowHalfWidth)
  expect(layout.rowCenterX(17)).toBe(0)
})
