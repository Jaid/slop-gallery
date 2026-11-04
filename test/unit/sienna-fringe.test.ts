import {expect, test} from 'bun:test'

import {siennaRugSize} from '../../src/lib/gallery/sienna.ts'
import rugFringeGeometry from '../../src/lib/gallery/sienna/RugFringeGeometry.ts'

test('the Sienna rug’s fringe stays at its short edges, with varied lengths', () => {
  const geometry = rugFringeGeometry(...siennaRugSize)
  try {
    const position = geometry.getAttribute('position')
    expect([...position.array].every(Number.isFinite)).toBe(true)
    geometry.computeBoundingBox()
    const bounds = geometry.boundingBox!
    expect(bounds.min.x).toBeGreaterThanOrEqual(-siennaRugSize[0] / 2)
    expect(bounds.max.x).toBeLessThanOrEqual(siennaRugSize[0] / 2)
    expect(bounds.min.z).toBeLessThan(-siennaRugSize[1] / 2 - 0.1)
    expect(bounds.max.z).toBeGreaterThan(siennaRugSize[1] / 2 + 0.1)
    for (let index = 0; index < position.count; index++) {
      expect(Math.abs(position.getZ(index))).toBeGreaterThan(siennaRugSize[1] / 2 - 0.02)
    }
  } finally {
    geometry.dispose()
  }
  expect(() => rugFringeGeometry(0, 1)).toThrow(RangeError)
})
