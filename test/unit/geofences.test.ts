import type {Vec3} from '../../src/lib/gallery/types.ts'

import {expect, test} from 'bun:test'

import {lodgeWindow} from '../../src/lib/gallery/lodge.ts'
import tunnelDisplays from '../../src/lib/gallery/tunnelDisplays.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'

/**
 * Every point of the gallery’s reachable air as of 2026-10-29: players standing on every floor (5, 90 and 175 cm up) and flying through every free point of the grid, every 75 cm.
 * Stored as 16-bit integers, three per point: x, y and z in centimeters.
 */
const data = new Int16Array(Bun.gunzipSync(await Bun.file(new URL('fixtures/reachable.bin.gz', import.meta.url)).bytes()).buffer)
const samples: Array<Vec3> = []
for (let index = 0; index < data.length; index += 3) {
  samples.push([data[index] / 100, data[index + 1] / 100, data[index + 2] / 100])
}
test('the rooms’ fences cover every point of the gallery’s reachable air', () => {
  expect(samples.length).toBeGreaterThan(80_000)
  const uncovered = samples.filter(position => !slopGallery.roomAt(position))
  expect(uncovered.slice(0, 5)).toEqual([])
})
test('the Lodge’s window niche belongs to the Lodge, out to the glass in the Corridor’s lining', () => {
  const sill = lodgeWindow.bottom + 0.2
  for (const x of [lodgeWindow.roomX - 0.2, (lodgeWindow.roomX + lodgeWindow.tunnelX) / 2, lodgeWindow.tunnelX + 0.05]) {
    expect(slopGallery.roomAt([x, sill, lodgeWindow.z])?.id).toBe('lodge')
  }
  expect(slopGallery.roomAt([lodgeWindow.tunnelX - 0.3, sill, lodgeWindow.z])?.id).toBe('corridor')
})
test('the balcony’s middle stays the Oculus’, the staff stairways behind the doors at its ends are the Exhibition’s', () => {
  const {door} = tunnelDisplays[0].stairway
  const over = door[1] + 1.6
  expect(slopGallery.roomAt([0, over, door[2]])?.id).toBe('oculus')
  for (const side of [-1, 1]) {
    expect(slopGallery.roomAt([side * (Math.abs(door[0]) - 0.5), over, door[2]])?.id).toBe('oculus')
    expect(slopGallery.roomAt([side * (Math.abs(door[0]) + 0.5), over, door[2]])?.id).toBe('exhibition')
  }
})
