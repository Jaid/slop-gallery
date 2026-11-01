import {describe, expect, test} from 'bun:test'

import ColumnPedestalGeometry, {columnPedestalHeight, columnPedestalRadius, columnShaft, fluteLobe} from '../../src/lib/gallery/ColumnPedestalGeometry.ts'
import OrbHolderGeometry from '../../src/lib/gallery/OrbHolderGeometry.ts'
import CellLayout from '../../src/rooms/cell/CellLayout.ts'

describe('the column pedestal', () => {
  test('stands a slender fluted shaft between a round base and capital far under the ceiling, its cap wide enough for an orb holder’s feet', () => {
    const column = new ColumnPedestalGeometry
    const holder = new OrbHolderGeometry
    try {
      column.stone.computeBoundingBox()
      const {min, max} = column.stone.boundingBox!
      expect(min.y).toBeCloseTo(0, 6)
      expect(max.y).toBeCloseTo(columnPedestalHeight, 6)
      expect(Math.max(-min.x, max.x, -min.z, max.z)).toBeCloseTo(columnPedestalRadius.foot, 3)
      expect(columnPedestalRadius.foot * 2).toBeLessThan(columnPedestalHeight / 2)
      const {height} = new CellLayout(0)
      expect(columnPedestalHeight).toBeLessThan(height / 2)
      // The holder’s feet stay well within the cap’s rim.
      const position = column.stone.getAttribute('position')
      const holderPosition = holder.metal.getAttribute('position')
      let feet = 0
      for (let index = 0; index < holderPosition.count; index++) {
        if (holderPosition.getY(index) < 0.01) {
          feet = Math.max(feet, Math.hypot(holderPosition.getX(index), holderPosition.getZ(index)))
        }
      }
      expect(feet).toBeLessThan(columnPedestalRadius.cap - 0.03)
      // The shaft’s ends keep within its fillets, its flutes cutting no deeper than they should, and the whole depth of a flute shows.
      const shaft: Array<number> = []
      for (let index = 0; index < position.count; index++) {
        const y = position.getY(index)
        if (Math.abs(y - columnShaft.bottom) > 1e-6 && Math.abs(y - columnShaft.top) > 1e-6) {
          continue
        }
        shaft.push(Math.hypot(position.getX(index), position.getZ(index)))
      }
      expect(shaft.length).toBeGreaterThan(columnShaft.flutes * 2)
      expect(Math.max(...shaft)).toBeCloseTo(columnShaft.radius, 6)
      expect(Math.min(...shaft)).toBeCloseTo(columnShaft.radius - columnShaft.fluteDepth, 4)
      expect(column.collision[1].length % 3).toBe(0)
    } finally {
      column.dispose()
      holder.dispose()
    }
  })
  test('cuts round flutes between flat fillets, the same in every period', () => {
    const lobe = fluteLobe(columnShaft.fillet)
    const fillet = columnShaft.fillet * Math.PI
    for (const turn of [0, fillet * 0.99, -fillet * 0.99]) {
      expect(lobe(turn)).toBe(1)
    }
    expect(lobe(Math.PI)).toBeCloseTo(-1, 9)
    expect(lobe(-Math.PI)).toBeCloseTo(-1, 9)
    for (const turn of [0.3, 1, 2, 3]) {
      expect(lobe(turn)).toBeCloseTo(lobe(-turn), 9)
      expect(lobe(turn + Math.PI * 2 * 7)).toBeCloseTo(lobe(turn), 9)
      expect(lobe(turn - Math.PI * 2 * 3)).toBeCloseTo(lobe(turn), 9)
    }
    // Deepening steadily from the fillet to the middle of the channel.
    let previous = 1
    for (let step = 1; step <= 50; step++) {
      const value = lobe(fillet + (Math.PI - fillet) * step / 50)
      expect(value).toBeLessThan(previous)
      previous = value
    }
  })
})
