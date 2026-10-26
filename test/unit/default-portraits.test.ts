import {expect, test} from 'bun:test'

import artworks from '../../src/levels/gallery/artworks.ts'
import slots from '../../src/levels/gallery/slots.ts'
import defaultPortraits, {readPortraitSet} from '../../src/lib/gallery/defaultPortraits.ts'

test('default works hang in distinct slots of their ratio, taking the slot’s size', () => {
  const portraits = defaultPortraits(7)
  expect(portraits.map(portrait => portrait.id)).toEqual(artworks.map(artwork => artwork.id))
  const used = new Set<string>
  for (const [index, portrait] of portraits.entries()) {
    const slot = slots.find(candidate => candidate.wallId === portrait.wallId && candidate.position.every((value, axis) => value === portrait.position[axis]))!
    expect(slot.ratio).toBe(artworks[index].ratio)
    expect([portrait.width, portrait.height, portrait.rotation]).toEqual([slot.width, slot.height, slot.rotation])
    expect(portrait.hung).toBe(true)
    expect(used.has(slot.id)).toBe(false)
    used.add(slot.id)
  }
})
test('the seed decides the assignment, and the same seed repeats it', () => {
  expect(defaultPortraits(7)).toEqual(defaultPortraits(7))
  const layouts = new Set([1, 2, 3, 4, 5].map(seed => JSON.stringify(defaultPortraits(seed).map(portrait => portrait.position))))
  expect(layouts.size).toBeGreaterThan(1)
})
test('?portrait_set is classic unless it is false', () => {
  for (const search of ['', '?portrait_set', '?portrait_set=classic', '?portrait_set=modern', '?portraits=false']) {
    expect(readPortraitSet(`https://example.com/${search}`)).toBe('classic')
  }
  expect(readPortraitSet('https://example.com/?portrait_set=false')).toBe(false)
})
