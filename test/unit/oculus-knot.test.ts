import {expect, test} from 'bun:test'

import {knotSign} from 'knot-materials/signs.ts'

import oculusBalcony from '../../src/lib/gallery/oculusBalcony.ts'
import tower, {towerFloorHeight} from '../../src/lib/gallery/oculusTower.ts'
import exhibitionKnots, {exhibitionRarityChances} from '../../src/rooms/exhibition/knots.ts'
import oculusKnot, {oculusKnotPosition, oculusKnotSign} from '../../src/rooms/oculus/knot.ts'
import salonKnot from '../../src/rooms/salon/knot.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'

const deckY = tower.floorY + tower.height
test('the seed alone picks the Oculus’ Knot, never one the Salon or the Exhibition shows, of any rarity the Exhibition rolls', () => {
  expect(oculusKnot(7).id).toBe(oculusKnot(7).id)
  const picks = Array.from({length: 400}, (_, seed) => {
    const knot = oculusKnot(seed)
    expect(knot.id).not.toBe(salonKnot(seed).id)
    expect(exhibitionKnots(seed).map(({entry}) => entry.id)).not.toContain(knot.id)
    return knot
  })
  const distinct = new Set(picks.map(knot => knot.id))
  expect(distinct.size).toBeGreaterThan(50)
  expect(new Set(picks.map(knot => knot.rarity))).toEqual(new Set(exhibitionRarityChances.map(([rarity]) => rarity)))
})
test('it floats over the drop between the tower’s deck and the balcony, at the eye level of someone on the deck', () => {
  const [x, y, z] = oculusKnotPosition
  expect(slopGallery.roomAt(oculusKnotPosition)?.id).toBe('oculus')
  expect(x).toBe(tower.x)
  expect(y).toBe(deckY + 1.5)
  expect(z).toBeCloseTo((tower.z + tower.radius + oculusBalcony.position[2] - oculusBalcony.size[2] / 2) / 2, 9)
  expect(z - (tower.z + tower.radius)).toBeGreaterThan(1.5)
  expect(towerFloorHeight(x, z)).toBeUndefined()
  // Nothing but the Oculus’ floor far below it
  expect(slopGallery.floorHeight(oculusKnotPosition)).toBe(tower.floorY)
})
test('its nameplate stands on the deck by its south rim, facing north toward whoever looks out at the Knot', () => {
  const [x, y, z] = oculusKnotSign.position
  expect(towerFloorHeight(x, z)).toBe(deckY)
  expect(y - knotSign.elevation).toBe(deckY)
  // Clear of the deck’s rail, 12 cm in from its rim, with the stand’s 20 cm foot
  expect(tower.z + tower.radius - z).toBeGreaterThan(0.12 + 0.2 + 0.1)
  expect(z).toBeLessThan(oculusKnotPosition[2])
  // Facing +z unturned, it turns half round to face north.
  expect(oculusKnotSign.rotation).toBeCloseTo(Math.PI, 9)
})
