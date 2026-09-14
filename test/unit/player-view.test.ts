import {afterEach, expect, test} from 'bun:test'

import {getKnotFocus, getKnotFocusDistance, setKnotFocus} from '../../src/lib/rendering/playerView.ts'

afterEach(() => setKnotFocus(0, 1))
test('Knot focus clamps blur amount and retains only valid positive focus distances', () => {
  setKnotFocus(2, 4.5)
  expect(getKnotFocus()).toBe(1)
  expect(getKnotFocusDistance()).toBe(4.5)
  setKnotFocus(-2, Number.NaN)
  expect(getKnotFocus()).toBe(0)
  expect(getKnotFocusDistance()).toBe(4.5)
  setKnotFocus(0.5, -1)
  expect(getKnotFocus()).toBe(0.5)
  expect(getKnotFocusDistance()).toBe(4.5)
})
