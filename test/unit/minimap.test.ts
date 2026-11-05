import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterEach, expect, test} from 'bun:test'

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import Minimap from '#component/GalleryMinimap'
import slopGallery from '#src/worlds/gallery/index.ts'

import {cameraPose, useGallery} from '../../src/lib/gallery.ts'
import {climbApex} from '../../src/lib/gallery/climb.ts'
import lowerGallery from '../../src/lib/gallery/lowerGallery.ts'
import {isLowerPosition, minimapHeading, minimapPortrait, minimapRooms, minimapViewBox} from '../../src/lib/gallery/minimap.ts'
import portraitObjects from '../../src/lib/gallery/portraitObjects.ts'
import samplePortraits from './fixtures/portraits.ts'

type PortraitObject = Parameters<typeof portraitObjects.set>[1]

/** where the eyes of a player standing on the floor at the height are */
const eye = ([x, floor, z]: Readonly<Vec3>): Vec3 => [x, floor + 1.62, z]
const initial = {...useGallery.getInitialState()}
const pose = {
  position: cameraPose.position,
  direction: cameraPose.direction,
}
afterEach(() => {
  Object.assign(useGallery.getInitialState(), initial)
  Object.assign(cameraPose, pose)
})
test.each([
  [[0, 0, -1], 0],
  [[1, 0, 0], 90],
  [[0, 0, 1], 180],
  [[-1, 0, 0], -90],
  [[0.5, 0.8, -0.5], 45],
] as const)('the red cone projects direction %j to %d degrees', (direction, degrees) => {
  expect(minimapHeading([...direction])).toBeCloseTo(degrees)
})
test('both layers share a scale and frame every room’s drawing', () => {
  const [x, z, width, height] = minimapViewBox.split(' ').map(Number)
  expect(minimapRooms.some(room => room.lower)).toBe(true)
  expect(minimapRooms.some(room => !room.lower)).toBe(true)
  for (const {frame: [roomX, roomZ, roomWidth, roomDepth]} of minimapRooms) {
    expect(roomX).toBeGreaterThan(x)
    expect(roomX + roomWidth).toBeLessThan(x + width)
    expect(roomZ).toBeGreaterThan(z)
    expect(roomZ + roomDepth).toBeLessThan(z + height)
  }
})
test('both layers render every room’s drawing without visible labels, numbers or legends', () => {
  cameraPose.position = [1, 1.6, 2]
  cameraPose.direction = [1, 0, 0]
  const [upper, lower] = [false, true].map(isLower => renderToStaticMarkup(createElement(Minimap, {lower: isLower})))
  const html = upper + lower
  expect(html.match(/<svg\b/gu)).toHaveLength(2 + minimapRooms.length)
  expect(html.match(/viewBox="/gu)).toHaveLength(2 + minimapRooms.length)
  expect(html).not.toContain('Upper level')
  expect(html).not.toContain('Lower level')
  expect(html).not.toMatch(/<(?:button|h[1-6]|text)\b/u)
  expect(html).toContain('translate(1 2) rotate(90)')
  // Every room’s drawing on its own floor, placed at the room’s origin.
  for (const room of minimapRooms) {
    expect((room.lower ? lower : upper).split(`<g data-room="${room.id}" opacity="${room.opacity(initial.room)}" transform="${room.transform}"><svg `)).toHaveLength(2)
  }
  expect(html.match(/data-portrait=/gu) ?? []).toHaveLength(initial.portraits.length * 2)
  const players = html.match(/<path[^>]+aria-label="Your position"[^>]*>/gu)!
  expect(players).toHaveLength(2)
  expect(players.filter(player => player.includes('display="inline"'))).toHaveLength(1)
})
test('the room the player stands in shows a little stronger than the others', () => {
  const current = minimapRooms.find(room => room.id === initial.room)!
  const others = minimapRooms.filter(room => room !== current)
  expect(current.opacity(initial.room)).toBeLessThan(1)
  for (const room of others) {
    expect(room.opacity(initial.room)).toBeGreaterThan(0)
    expect(room.opacity(initial.room)).toBeLessThan(current.opacity(initial.room))
    expect(room.opacity(room.id)).toBe(current.opacity(initial.room))
  }
})
test('hanging portraits belong to their wall’s floor even when rooms overlap vertically', () => {
  const portrait = {
    ...samplePortraits[0],
    hung: true,
    wallId: 'oculus-north',
    position: [0, 0.1, -24] as [number, number, number],
  }
  expect(minimapPortrait(portrait).lower).toBe(true)
  expect(minimapPortrait({
    ...portrait,
    wallId: 'lobby-north',
  }).lower).toBe(false)
})
test('the Bastion shows on the lower floor up to the apex of its western hairpin and its climb to the Forge from there on the upper floor', () => {
  const drawings = minimapRooms.filter(room => room.id === 'bastion')
  expect(drawings.map(room => room.lower)).toEqual([true, false])
  const [apexX, apexZ] = climbApex.point
  // In the mouth under the run north, on the hairpin’s west leg and just short of the apex, then just past it, up the east leg and along the run north over the mouth.
  for (const [position, lower] of [
    [[-15, -3.9, -24], true],
    [[-22.3, -3.9, -24], true],
    [[-28.3, -3, -16], true],
    [[apexX - 0.3, -2, apexZ], true],
    [[apexX + 0.3, -1.9, apexZ], false],
    [[-22.3, -0.5, -16], false],
    [[-22.3, 0, -24], false],
    [[-22.3, 0, -30], false],
  ] as const) {
    const at = eye(position)
    expect(slopGallery.roomAt(at)?.id).toBe('bastion')
    expect(isLowerPosition('bastion', at)).toBe(lower)
  }
  expect(isLowerPosition('bastion', eye(slopGallery.room('bastion').spawn.position))).toBe(true)
})
test('portrait dots follow rigid bodies instead of the positions in the store', () => {
  const portrait = {
    ...samplePortraits[0],
    id: 'minimap-test',
    hung: false,
  }
  const physical: {
    x: number
    y: number
    z: number
  } = {
    x: lowerGallery.oculus.center[0],
    y: lowerGallery.floorY + 1,
    z: lowerGallery.oculus.center[1],
  }
  portraitObjects.set(portrait.id, Object.assign(Object.create(null) as PortraitObject, {body: {translation: () => physical}}))
  try {
    expect(minimapPortrait(portrait)).toEqual({
      position: [physical.x, physical.y, physical.z],
      lower: true,
    })
    physical.x = 2
    expect(minimapPortrait(portrait).position).toEqual([2, physical.y, physical.z])
  } finally {
    portraitObjects.delete(portrait.id)
  }
})
