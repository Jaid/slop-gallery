import {expect, test} from 'bun:test'

import {readDevelopmentMode} from '../../src/lib/developmentMode.ts'

test('development mode is enabled by a bare or true flag only', () => {
  expect(readDevelopmentMode('?development')).toBe(true)
  expect(readDevelopmentMode('?development=true')).toBe(true)
  for (const search of ['', '?development=false', '?development=1', '?development=TRUE', '?dev=true']) {
    expect(readDevelopmentMode(search)).toBe(false)
  }
})
