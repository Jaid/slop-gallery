import {expect, test} from 'bun:test'

import walls from '../../src/lib/gallery/walls.ts'
import {rooms} from '../../src/rooms/index.ts'

const hangable = walls.filter(wall => wall.hangable !== false && !wall.curveRadius)
const stickyWalls = rooms.flatMap(room => room.worldStickyWalls())
// The gallery’s walls still go by kebab-case ids within their room.
const legacyId = (id: string) => id.replaceAll('_', '-')
test('the rooms’ sticky walls are the gallery’s hangable walls', () => {
  expect(stickyWalls.map(wall => legacyId(wall.id)).toSorted()).toEqual(hangable.map(wall => wall.id).toSorted())
})
test('every sticky wall stands where its gallery wall does, with its openings and reservations', () => {
  for (const wall of stickyWalls) {
    const original = hangable.find(value => value.id === legacyId(wall.id))!
    expect(wall.room).toBe(original.room)
    for (const [index, value] of wall.center.entries()) {
      expect(value).toBeCloseTo(original.center[index], 5)
    }
    expect(Math.cos(wall.rotation)).toBeCloseTo(Math.cos(original.rotation), 9)
    expect(Math.sin(wall.rotation)).toBeCloseTo(Math.sin(original.rotation), 9)
    expect(wall.width).toBeCloseTo(original.width, 5)
    expect(wall.height).toBeCloseTo(original.height, 5)
    expect(wall.holes?.length ?? 0).toBe(original.holes?.length ?? 0)
    for (const [index, hole] of (wall.holes ?? []).entries()) {
      const originalHole = original.holes![index]
      expect(hole.profile).toBe(originalHole.profile)
      for (const key of ['u', 'width', 'height', 'bottom', 'glassThickness'] as const) {
        expect(hole[key] ?? 0).toBeCloseTo(originalHole[key] ?? 0, 5)
      }
    }
    expect(wall.reservations?.length ?? 0).toBe(original.reservations?.length ?? 0)
  }
})
