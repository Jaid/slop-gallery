import {expect, test} from 'bun:test'

import {prime} from 'knot-materials'

import salonKnot, {salonKnotPosition} from '../../src/rooms/salon/knot.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'

test('the Salon shows a prime Knot that the environment’s seed picks', () => {
  const picks = Array.from({length: 40}, (_, seed) => salonKnot(seed))
  expect(picks.every(knot => knot.rarity === prime)).toBe(true)
  expect(salonKnot(7).id).toBe(salonKnot(7).id)
  const distinct = new Set(picks.map(knot => knot.id))
  expect(distinct.size).toBeGreaterThan(10)
})
test('the Knot floats over its pedestal in the Salon’s north half', () => {
  expect(slopGallery.roomAt(salonKnotPosition)?.id).toBe('salon')
  expect(salonKnotPosition).toEqual([14, 1.9, -29])
})
