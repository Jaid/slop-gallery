import {describe, expect, test} from 'bun:test'

import slots from '../../src/lib/gallery/slots.ts'
import {galleryPlacement, placementIssue} from '../../src/lib/gallery/walls.ts'
import {asPortrait, portraitRatios, slotFrame} from '../../src/lib/placement/portraitSlots.ts'

const occupied = slots.map(asPortrait)
describe('portrait slots', () => {
  test('frames keep their ratio at every size', () => {
    for (const ratio of ['1:1', '2:3', '3:2'] as const) {
      const {width, height} = slotFrame(ratio, 1.8)
      expect(width / height).toBeCloseTo(portraitRatios[ratio], 9)
      expect(Math.max(width, height)).toBe(1.8)
    }
  })
  test('have unique IDs and frames of their ratio', () => {
    const ids = new Set(slots.map(slot => slot.id))
    expect(ids.size).toBe(slots.length)
    for (const slot of slots) {
      expect(slot.width / slot.height).toBeCloseTo(portraitRatios[slot.ratio], 9)
    }
  })
  test('stay valid hanging spots with every other slot filled', () => {
    for (const slot of slots) {
      const wall = galleryPlacement.wall(slot.wallId)!
      expect(placementIssue(wall, slot.position, slot.width, slot.height, occupied, slot.id, slot.labelAbove)).toBe('')
      expect(galleryPlacement.contains(slot.position)).toBe(true)
    }
  })
})
