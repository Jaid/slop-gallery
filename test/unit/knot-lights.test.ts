import {expect, test} from 'bun:test'

import {knotGalleryBounds} from '../../src/lib/gallery/knotGallery.ts'
import {knotBays, knotLayout} from '../../src/lib/knots/exhibition.ts'
import KnotLayout from '../../src/lib/knots/KnotLayout.ts'
import KnotLightDamage, {isKnotLightDamageImpact, knotLight, knotLightFlicker, knotLightImpactEnergy, knotLightSlots} from '../../src/lib/knots/KnotLights.ts'

test('every candidate row gets a pane over every slot in the longest row', () => {
  const exhibitionSlots = knotLightSlots(knotLayout, knotBays.length, knotGalleryBounds.height)
  expect(exhibitionSlots).toHaveLength(knotBays.length * knotLayout.maxRowLength)
  expect(new Set(knotBays.map((_, row) => exhibitionSlots.filter(slot => slot.row === row).length))).toEqual(new Set([knotLayout.maxRowLength]))
  const layout = new KnotLayout([1, 4, 2])
  const slots = knotLightSlots(layout, 3, 5.8)
  expect(layout.maxRowLength).toBe(4)
  expect(slots).toHaveLength(12)
  for (let row = 0; row < 3; row++) {
    const rowSlots = slots.filter(slot => slot.row === row)
    expect(rowSlots).toHaveLength(4)
    expect(rowSlots.map(slot => slot.position[0])).toEqual(Array.from({length: 4}, (_, slot) => layout.slotX(slot)))
    expect(rowSlots.every(slot => slot.position[1] === 5.8 - knotLight.ceilingInset)).toBe(true)
    expect(rowSlots.every(slot => slot.position[2] === layout.rowZ(row))).toBe(true)
  }
})
test('only thrown heavy objects advance a pane from healthy to flickering to broken', () => {
  expect(knotLightImpactEnergy(4.6, 10)).toBe(230)
  expect(isKnotLightDamageImpact(1.8, 10)).toBe(false)
  expect(isKnotLightDamageImpact(4.6, 1)).toBe(false)
  expect(isKnotLightDamageImpact(4.6, 10)).toBe(true)
  const damage = new KnotLightDamage(1)
  expect(damage.hit(0, 1.8, 10, 0)).toBe(false)
  expect(damage.stage(0)).toBe(0)
  expect(damage.hit(0, 4.6, 10, 0)).toBe(true)
  expect(damage.stage(0)).toBe(1)
  expect(damage.hit(0, 4.6, 10, knotLight.impactCooldown / 2)).toBe(false)
  expect(damage.stage(0)).toBe(1)
  expect(damage.hit(0, 4.6, 10, knotLight.impactCooldown + 0.01)).toBe(true)
  expect(damage.stage(0)).toBe(2)
  expect(damage.intensity(0, 10)).toBe(0)
  expect(damage.hit(0, 4.6, 10, 20)).toBe(false)
})
test('damaged panes flicker chaotically from deterministic noise', () => {
  const first = Array.from({length: 240}, (_, index) => knotLightFlicker(73, index / 120))
  const repeat = Array.from({length: 240}, (_, index) => knotLightFlicker(73, index / 120))
  const other = Array.from({length: 240}, (_, index) => knotLightFlicker(74, index / 120))
  expect(repeat).toEqual(first)
  expect(other).not.toEqual(first)
  expect(new Set(first.map(value => value.toFixed(4))).size).toBeGreaterThan(30)
  expect(Math.min(...first)).toBeLessThan(0.1)
  expect(Math.max(...first)).toBeGreaterThan(0.75)
})
