import {describe, expect, test} from 'bun:test'

import {Box3} from 'three/webgpu'

import lodgeInterior, {lodgeHatchetHook} from '../../src/lib/gallery/lodgeInterior/layout.ts'
import createLodgeHatchetHookGeometry, {createLodgeHatchetLeatherGeometry} from '../../src/lib/gallery/lodgeInterior/LodgeHatchetHookGeometry.ts'

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
  test('keeps the leather band in the static hook frame when the hatchet is picked up', () => {
    const leather = createLodgeHatchetLeatherGeometry()
    try {
      const bounds = new Box3
      bounds.setFromBufferAttribute(leather.getAttribute('position') as never)
      // The band is already transformed into the hook's frame, around its upturned tip.
      expect(bounds.max.y).toBeGreaterThan(0)
      expect(bounds.max.y).toBeLessThan(0.04)
      expect(bounds.min.z).toBeLessThan(-0.2)
      expect(bounds.max.z).toBeGreaterThan(-0.21)
      expect(leather.index!.count).toBeGreaterThan(0)
    } finally {
      leather.dispose()
    }
  })
})
