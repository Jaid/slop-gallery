import {expect, test} from 'bun:test'

import {prerenderInventory} from '../../scripts/prerenderAllVoices.ts'
import portraits from '../../src/levels/gallery/collection.ts'

test('the remaining prerender inventory covers every bundled portrait exactly once', () => {
  const inventory = prerenderInventory()
  const outputs = new Set(inventory.map(item => item.output))
  const ids = new Set(inventory.map(item => item.id))
  expect(inventory).toHaveLength(portraits.length)
  expect(outputs.size).toBe(inventory.length)
  expect(ids.size).toBe(inventory.length)
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
