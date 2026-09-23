import {expect, test} from 'bun:test'

import getEgoPointerSpeed from '../src/EgoPointerSpeed.ts'

test('only extended zoom reduces pointer speed to one quarter', () => {
  expect(getEgoPointerSpeed(1, 'none')).toBe(1)
  expect(getEgoPointerSpeed(1, 'casual')).toBe(1)
  expect(getEgoPointerSpeed(1, 'extended')).toBe(0.25)
  expect(getEgoPointerSpeed(2, 'extended')).toBe(0.5)
})
