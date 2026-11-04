import {expect, test} from 'bun:test'

import {columnPedestalRadius} from '../../src/lib/gallery/ColumnPedestalGeometry.ts'
import {orbs} from '../../src/lib/gallery/orbs/index.ts'
import {vesper, vesperOrbPedestals} from '../../src/lib/gallery/vesper.ts'
import {floorHeight, roomAt} from './fixtures/gallery.ts'

test('the Vesper stands its orbs on column pedestals in two rows between the middle of its north half and its own middle, at least one for every kind, clear of the walls and of each other', () => {
  expect(vesperOrbPedestals.length).toBeGreaterThanOrEqual(orbs.length)
  const [centerX, centerZ] = vesper.center
  const middleX = vesperOrbPedestals.reduce((sum, {position: [x]}) => sum + x, 0) / vesperOrbPedestals.length
  const middleZ = vesperOrbPedestals.reduce((sum, {position: [, , z]}) => sum + z, 0) / vesperOrbPedestals.length
  expect(middleX).toBeCloseTo(centerX, 9)
  expect(middleZ).toBeLessThan(centerZ - 3)
  for (const [index, {position, rotation}] of vesperOrbPedestals.entries()) {
    const [x, y, z] = position
    expect(roomAt([x, 1.7, z])).toBe('vesper')
    expect(y).toBe(floorHeight([x, 1.7, z]))
    // Room enough to walk round it, short of the walls.
    expect(vesper.size[0] / 2 - Math.abs(x - centerX) - columnPedestalRadius.foot).toBeGreaterThan(3)
    expect(vesper.size[1] / 2 - Math.abs(z - centerZ) - columnPedestalRadius.foot).toBeGreaterThan(3)
    // The holder’s front foot faces out from the rows’ middle.
    expect(Math.sin(rotation) * (x - middleX) + Math.cos(rotation) * (z - middleZ)).toBeCloseTo(Math.hypot(x - middleX, z - middleZ), 9)
    for (const {position: [otherX, , otherZ]} of vesperOrbPedestals.slice(index + 1)) {
      expect(Math.hypot(otherX - x, otherZ - z) - columnPedestalRadius.foot * 2).toBeGreaterThan(1.5)
    }
  }
})
