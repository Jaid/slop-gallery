import {expect, test} from 'bun:test'

import {readStreamBudget} from '../../src/lib/rendering/streamBudget.ts'

test('?stream_budget takes milliseconds or false, 8 by default', () => {
  expect(readStreamBudget('')).toBe(8)
  expect(readStreamBudget('?stream_budget=15')).toBe(15)
  expect(readStreamBudget('?stream_budget=2.5')).toBe(2.5)
  expect(readStreamBudget('?stream_budget=0')).toBe(0)
  expect(readStreamBudget('?stream_budget=false')).toBe(false)
  expect(readStreamBudget('?stream_budget=-1')).toBe(8)
  expect(readStreamBudget('?stream_budget=unlimited')).toBe(8)
  expect(readStreamBudget('?stream_budget')).toBe(8)
})
test('?test=true streams without a limit unless ?stream_budget says otherwise', () => {
  expect(readStreamBudget('?test=true')).toBe(false)
  expect(readStreamBudget('?test=true&stream_budget=4')).toBe(4)
  expect(readStreamBudget('?test=false')).toBe(8)
})
