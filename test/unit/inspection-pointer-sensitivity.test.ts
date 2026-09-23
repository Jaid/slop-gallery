import {expect, test} from 'bun:test'

import inspectionPointerSensitivity from '../../src/lib/camera/inspectionPointerSensitivity.ts'

test('inspection pointer modifiers provide normal, precision and accelerated look speeds', () => {
  const base = 0.002
  expect(inspectionPointerSensitivity(base, false, false)).toBe(base)
  expect(inspectionPointerSensitivity(base, true, false)).toBe(base * 0.1)
  expect(inspectionPointerSensitivity(base, false, true)).toBe(base * 2)
  expect(inspectionPointerSensitivity(base, true, true)).toBe(base * 0.1)
})
