import {expect, test} from 'bun:test'

import {prerenderInventory} from '../../scripts/prerenderAllVoices.ts'
import portraits from '../../src/levels/gallery/collection.ts'
import {knotAnnouncements} from '../../src/lib/knots/announcements.ts'
import {knots} from '../../src/lib/knots/index.ts'

test('the replacement inventory covers every knot, model and bundled portrait exactly once', () => {
  const inventory = prerenderInventory()
  expect(inventory).toHaveLength(knotAnnouncements(knots).length + portraits.length)
  expect(new Set(inventory.map(item => item.output)).size).toBe(inventory.length)
  expect(new Set(inventory.map(item => item.id)).size).toBe(inventory.length)
  for (const item of inventory) {
    expect(item.output).toEndWith('.opus')
    expect(item.output).not.toContain('\\')
    expect(item.input.length).toBeGreaterThan(0)
    expect(item.input).not.toMatch(/[!.?]$/u)
    expect(item.maximumDuration).toBeGreaterThan(0)
  }
  for (const portrait of portraits) {
    const item = inventory.find(candidate => candidate.id === `gallery/${portrait.id}`)!
    expect(item.output).toEndWith(`/public${portrait.narration}`)
    expect(item.input).toContain(portrait.description.trim().replace(/[!.?]+$/u, ''))
  }
  expect(inventory.some(item => item.output.endsWith('/doge.opus'))).toBe(false)
})
