import {expect, test} from 'bun:test'

import {common, ethereal, knots, prime, rare} from 'knot-materials'
import {createKnotGeometry} from 'knot-materials/geometry.ts'

import {environmentWeightedPick} from '../../src/lib/environmentSeed.ts'
import lowerGallery, {tunnelFloorHeight} from '../../src/lib/gallery/lowerGallery.ts'
import tunnelDisplays, {tunnelDisplayWindow} from '../../src/lib/gallery/tunnelDisplays.ts'
import exhibitionKnots, {exhibitionPedestal, exhibitionRarityChances, exhibitionSlots} from '../../src/rooms/exhibition/knots.ts'
import salonKnot from '../../src/rooms/salon/knot.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'

const seeds = Array.from({length: 4000}, (_, seed) => seed)
test('weighted picks follow their weights and depend only on seed and ID', () => {
  const counts = new Map<string, number>
  for (const seed of seeds) {
    const pick = environmentWeightedPick(seed, 'weighted', [['a', 3], ['b', 1], ['never', 0]])
    counts.set(pick, (counts.get(pick) ?? 0) + 1)
  }
  expect(counts.get('never')).toBeUndefined()
  expect(counts.get('a')! / seeds.length).toBeCloseTo(0.75, 1)
  expect(environmentWeightedPick(9, 'weighted', [['a', 1], ['b', 1]])).toBe(environmentWeightedPick(9, 'weighted', [['a', 1], ['b', 1]]))
  expect(() => environmentWeightedPick(1, 'empty', [])).toThrow()
  expect(() => environmentWeightedPick(1, 'weightless', [['a', 0]])).toThrow()
  expect(() => environmentWeightedPick(1, 'negative', [['a', 2], ['b', -1]])).toThrow()
})
test('the seed alone picks six distinct Knots, never the Salon’s, rolling the rarity first', () => {
  expect(exhibitionRarityChances.reduce((sum, [, chance]) => sum + chance, 0)).toBeCloseTo(1, 9)
  expect(exhibitionKnots(7).map(knot => knot.entry.id)).toEqual(exhibitionKnots(7).map(knot => knot.entry.id))
  const rarities = new Map<number, number>
  for (const seed of seeds) {
    const picks = exhibitionKnots(seed)
    expect(picks).toHaveLength(6)
    const ids = new Set(picks.map(knot => knot.entry.id))
    expect(ids.size).toBe(6)
    expect(ids.has(salonKnot(seed).id)).toBe(false)
    for (const {entry} of picks) {
      rarities.set(entry.rarity, (rarities.get(entry.rarity) ?? 0) + 1)
    }
  }
  const total = seeds.length * 6
  expect(rarities.keys().toArray().toSorted((a, b) => a - b)).toEqual([common, rare, prime, ethereal])
  for (const [rarity, chance] of exhibitionRarityChances) {
    expect(Math.abs(rarities.get(rarity)! / total - chance)).toBeLessThan(0.015)
  }
  const distinct = new Set(seeds.flatMap(seed => exhibitionKnots(seed).map(knot => knot.entry.id)))
  expect(distinct.size).toBeGreaterThan(knots.length / 2)
})
test('every Knot floats inside its display in full view of the window, clear of its pedestal, the ceiling and the walls', () => {
  const geometry = createKnotGeometry()
  const bounds = geometry.boundingBox!
  const positions = geometry.getAttribute('position')
  let reach = 0
  for (let i = 0; i < positions.count; i++) {
    reach = Math.max(reach, Math.hypot(positions.getX(i), positions.getZ(i)))
  }
  geometry.dispose()
  const displacement = Math.max(...knots.map(knot => knot.displacement ?? 0))
  expect(exhibitionSlots).toHaveLength(6)
  for (const slot of exhibitionSlots) {
    const display = tunnelDisplays.find(value => value.exhibits.some(exhibit => exhibit.id === slot.id))!
    const [x, y, z] = slot.position
    const floor = tunnelFloorHeight(z)
    expect(slot.floor[1]).toBeCloseTo(floor, 9)
    expect(slopGallery.roomAt([x, y, z])?.id).toBe('exhibition')
    // Turning only around the vertical, the Knot keeps its lowest and highest point however far it turned.
    const bottom = y + bounds.min.y - displacement
    const top = y + bounds.max.y + displacement
    expect(bottom - (floor + exhibitionPedestal.height)).toBeGreaterThan(0.15)
    expect(y + bounds.min.y - floor).toBeGreaterThan(tunnelDisplayWindow.bottom)
    expect(y + bounds.max.y - floor).toBeLessThan(tunnelDisplayWindow.top)
    // The floor and the ceiling slope, so they come closest at the end of the Knot’s reach.
    expect(tunnelFloorHeight(z + reach + displacement) + lowerGallery.tunnel.height - top).toBeGreaterThan(0.5)
    expect(display.size[0] / 2 - Math.abs(x - display.center[0]) - reach - displacement).toBeGreaterThan(0.4)
    expect(display.size[1] / 2 - Math.abs(z - display.center[1]) - reach - displacement).toBeGreaterThan(0.4)
  }
})
