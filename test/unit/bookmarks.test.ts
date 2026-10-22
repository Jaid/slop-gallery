import type {PlayerPose} from '../../src/lib/gallery/types.ts'

import {expect, test} from 'bun:test'

import {nextBookmark} from '../../src/lib/gallery/bookmarks.ts'

const pose = (x: number, z: number): PlayerPose => ({
  position: [x, 0, z],
  yaw: 0,
  pitch: 0,
})
const list = [pose(0, 0), pose(3, 0), pose(20, 0)]
test('away from every bookmark, T picks the closest one', () => {
  expect(nextBookmark([1.8, 0, 0], list)).toBe(1)
  expect(nextBookmark([15, 0, 0], list)).toBe(2)
})
test('within a meter of a bookmark, T cycles on to the next one', () => {
  expect(nextBookmark([0.6, 0, 0.6], list)).toBe(1)
  expect(nextBookmark([3, 0, 0], list)).toBe(2)
  expect(nextBookmark([20, 0, 0.9], list)).toBe(0)
})
test('a level without bookmarks has no target', () => {
  expect(nextBookmark([0, 0, 0], [])).toBeNull()
})
