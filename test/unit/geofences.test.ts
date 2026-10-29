import type {Vec3} from '../../src/lib/gallery/types.ts'

import {expect, test} from 'bun:test'

import {lodgeThreshold} from '../../src/lib/gallery/corridor.ts'
import {lodgeWindow} from '../../src/lib/gallery/lodge.ts'
import tunnelDisplays from '../../src/lib/gallery/tunnelDisplays.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'

type Sample = {
  /** the room the gallery’s navigation before its fences said the point lies in */
  legacy: string
  position: Vec3
}

/**
 * Every point of the gallery’s reachable air, as its navigation before the rooms had fences of their own sampled it: players standing on every floor (5, 90 and 175 cm up) and flying through every free point of the grid, every 75 cm, rounded to centimeters.
 * Stored as base64 16-bit integers, four per point: x, y and z in centimeters and the index of the room it said the point lies in.
 */
const decoder = new TextDecoder
const compressed = await Bun.file(new URL('fixtures/reachable.json.gz', import.meta.url)).bytes()
const fixture = JSON.parse(decoder.decode(Bun.gunzipSync(compressed))) as {
  points: string
  rooms: ReadonlyArray<string>
}
const data = new Int16Array(Uint8Array.fromBase64(fixture.points).buffer)
const samples: Array<Sample> = []
for (let index = 0; index < data.length; index += 4) {
  samples.push({
    position: [data[index] / 100, data[index + 1] / 100, data[index + 2] / 100],
    legacy: fixture.rooms[data[index + 3]],
  })
}
const near = (value: number, from: number, to: number) => value >= Math.min(from, to) - 1e-6 && value <= Math.max(from, to) + 1e-6
/** where a point may belong to another room than before, and why */
const reassigned: Partial<Record<string, (position: Vec3) => boolean>> = {
  // The tunnel, its displays and the staff stairways down to them from the balcony’s ends became the Exhibition.
  'oculus→exhibition': () => true,
  // The passage from the Oculus became the Fortress.
  'lodge→fortress': () => true,
  // The Lodge’s half of the doorway passage from the Corridor’s hall.
  'corridor→lodge': ([x, , z]) => near(x, lodgeThreshold.center[0] - lodgeThreshold.size[0] / 2, lodgeThreshold.center[0] + lodgeThreshold.size[0] / 2) && near(z, lodgeThreshold.center[1] - lodgeThreshold.size[1] / 2, lodgeThreshold.center[1] + lodgeThreshold.size[1] / 2),
}
test('the fixture samples the whole gallery', () => {
  expect(samples.length).toBeGreaterThan(80_000)
  expect(fixture.rooms.toSorted()).toEqual(['antechamber', 'banquet', 'corridor', 'lobby', 'lodge', 'moonfall', 'oculus', 'salon', 'sienna', 'vesper'])
})
test('the rooms’ fences cover every point of the gallery’s reachable air', () => {
  const uncovered = samples.filter(({position}) => !slopGallery.roomAt(position))
  expect(uncovered.slice(0, 5)).toEqual([])
})
test('points only change rooms where the new rooms took them over, or where the old room’s fence still holds them but an earlier one shares it', () => {
  const changes = new Map<string, number>
  const unexpected: Array<string> = []
  for (const {legacy, position} of samples) {
    const room = slopGallery.roomAt(position)?.id
    if (!room || room === legacy || slopGallery.room(legacy as never).contains(position)) {
      continue
    }
    const change = `${legacy}→${room}`
    changes.set(change, (changes.get(change) ?? 0) + 1)
    if (!reassigned[change]?.(position)) {
      unexpected.push(`${change} at ${position.join(', ')}`)
    }
  }
  expect(unexpected.slice(0, 10)).toEqual([])
  // Thousands of points went to the Exhibition and the Fortress, a few dozen around the Lodge’s doorway and window.
  expect(changes.get('oculus→exhibition')).toBeGreaterThan(3000)
  expect(changes.get('lodge→fortress')).toBeGreaterThan(1000)
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
