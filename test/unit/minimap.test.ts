import {afterEach, expect, test} from 'bun:test'

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import Minimap from '#component/Minimap'

import {cameraPose, initialPortraits, useGallery} from '../../src/lib/gallery.ts'
import {lowerGallery} from '../../src/lib/gallery/lowerGallery.ts'
import {minimapHeading, minimapPortrait, minimapViewBox, minimapWalls} from '../../src/lib/gallery/minimap.ts'
import {portraitObjects} from '../../src/lib/gallery/portraitObjects.ts'

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
] as const)('the red cone projects direction %j to %s degrees', (direction, degrees) => {
  expect(minimapHeading([...direction])).toBeCloseTo(degrees)
})
test('both layers share a scale and contain all wall outlines', () => {
  const [x, z, width, height] = minimapViewBox.split(' ').map(Number)
  expect(minimapWalls.some(wall => wall.lower)).toBe(true)
  expect(minimapWalls.some(wall => !wall.lower)).toBe(true)
  for (const wall of minimapWalls) {
    for (const point of wall.points) {
      expect(point[0]).toBeGreaterThan(x)
      expect(point[0]).toBeLessThan(x + width)
      expect(point[2]).toBeGreaterThan(z)
      expect(point[2]).toBeLessThan(z + height)
    }
  }
})
test('both layers render without visible labels, numbers, legends or room fills', () => {
  cameraPose.position = [1, 1.6, 2]
  cameraPose.direction = [1, 0, 0]
  const html = [false, true].map(lower => renderToStaticMarkup(createElement(Minimap, {lower}))).join('')
  expect(html.match(/<svg\b/gu)).toHaveLength(2)
  expect(html.match(/viewBox="/gu)).toHaveLength(2)
  expect(html).not.toContain('Upper level')
  expect(html).not.toContain('Lower level')
  expect(html).not.toMatch(/<(?:button|h[1-6]|rect|text)\b/u)
  expect(html).toContain('translate(1 2) rotate(90)')
  expect(html.match(/data-portrait=/gu)).toHaveLength(initial.portraits.length * 2)
  const players = html.match(/<path[^>]+aria-label="Your position"[^>]*>/gu)!
  expect(players).toHaveLength(2)
  expect(players.filter(player => player.includes('display="inline"'))).toHaveLength(1)
})
test('hanging portraits belong to their wall’s floor even when rooms overlap vertically', () => {
  const portrait = {
    ...initialPortraits[0],
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
test('portrait dots follow rigid bodies instead of stale saved positions', () => {
  const portrait = {
    ...initialPortraits[0],
    id: 'minimap-test',
    hung: false,
  }
  const physical = {
    x: lowerGallery.oculus.center[0],
    y: lowerGallery.floorY + 1,
    z: lowerGallery.oculus.center[1],
  }
  portraitObjects.set(portrait.id, Object.assign(Object.create(null), {body: {translation: () => physical}}))
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
