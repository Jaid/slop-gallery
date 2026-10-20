import {expect, test} from 'bun:test'

import artworks from '../../src/lib/gallery/artworks.ts'
import defaultPortraits, {readDefaultPortraitsEnabled} from '../../src/lib/gallery/defaultPortraits.ts'
import slots from '../../src/lib/gallery/slots.ts'

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
test('only ?portraits=false turns the default works off', () => {
  expect(readDefaultPortraitsEnabled('https://example.com/')).toBe(true)
  expect(readDefaultPortraitsEnabled('https://example.com/?portraits')).toBe(true)
  expect(readDefaultPortraitsEnabled('https://example.com/?portraits=true')).toBe(true)
  expect(readDefaultPortraitsEnabled('https://example.com/?portraits=false')).toBe(false)
})
