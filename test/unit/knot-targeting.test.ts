import {expect, test} from 'bun:test'

import {knotGalleryBounds, knotGalleryCenter} from '../../src/lib/gallery/knotGallery.ts'
import knottingham from '../../src/worlds/knottingham/index.ts'

test('Knottingham blocks targeting beyond each of its walls, and only there', () => {
  const {minX, maxX, northZ, southZ, height} = knotGalleryBounds
  const [x, , z] = knotGalleryCenter
  expect(knottingham.wallDistance([x, 1, z], [1, 0, 0])).toBeCloseTo(maxX - x)
  expect(knottingham.wallDistance([x, 1, z], [-1, 0, 0])).toBeCloseTo(x - minX)
  expect(knottingham.wallDistance([x, 1, z], [0, 0, 1])).toBeCloseTo(southZ - z)
  expect(knottingham.wallDistance([x, 1, z], [0, 0, -1])).toBeCloseTo(z - northZ)
  expect(knottingham.wallDistance([x, 1, z], [2, 0, 0])).toBeCloseTo(maxX - x)
  expect(knottingham.wallDistance([maxX + 2, 1, z], [-1, 0, 0])).toBeCloseTo(2)
  expect(knottingham.wallDistance([maxX + 2, 1, z], [1, 0, 0])).toBe(Infinity)
  expect(knottingham.wallDistance([x, height + 1, z], [1, 0, 0])).toBe(Infinity)
  expect(knottingham.wallDistance([x, 1, z], [0, 1, 0])).toBe(Infinity)
  expect(knottingham.wallDistance([x, 1, z], [0, 0, 0])).toBe(Infinity)
  expect(knottingham.wallDistance([Number.NaN, 1, z], [1, 0, 0])).toBe(Infinity)
})
