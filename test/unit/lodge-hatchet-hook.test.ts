import {describe, expect, test} from 'bun:test'

import {Box3} from 'three/webgpu'

import lodgeInterior, {lodgeHatchetHook} from '../../src/lib/gallery/lodgeInterior/layout.ts'
import createLodgeHatchetHookGeometry from '../../src/lib/gallery/lodgeInterior/LodgeHatchetHookGeometry.ts'

describe('the Lodge’s hatchet hook', () => {
  test('mounts on the room-facing surface of the right fireplace pillar', () => {
    const {front, openingHalfWidth, width} = lodgeInterior.fireplace
    const pillarCenter = (openingHalfWidth + width / 2) / 2
    expect(lodgeHatchetHook.position[0]).toBeCloseTo(-pillarCenter)
    expect(lodgeHatchetHook.position[2]).toBeLessThan(front)
    expect(lodgeHatchetHook.position[2]).toBeGreaterThan(front - 0.03)
    expect(lodgeHatchetHook.position[1]).toBeGreaterThan(1)
    expect(lodgeHatchetHook.position[1]).toBeLessThan(lodgeInterior.fireplace.opening)
  })
  test('curves out from its mounting plate and tips up to hold the hatchet loop', () => {
    const geometry = createLodgeHatchetHookGeometry()
    try {
      const box = new Box3
      box.setFromBufferAttribute(geometry.getAttribute('position') as never)
      expect(box.min.z).toBeLessThan(-0.2)
      expect(box.max.z).toBeGreaterThan(0)
      expect(box.max.y).toBeGreaterThan(0.055)
      expect(box.min.y).toBeLessThan(-0.06)
      expect(geometry.index!.count / 3).toBeLessThan(1000)
    } finally {
      geometry.dispose()
    }
  })
})