import {expect, test} from 'bun:test'

import {readPmrem} from '../../src/lib/rendering/pmrem.ts'

test('?pmrem accepts only the gallery environment and otherwise leaves the knots their own', () => {
  expect(readPmrem('?pmrem=slop_gallery')).toBe('slop_gallery')
  expect(readPmrem('?pmrem=studio')).toBeUndefined()
  expect(readPmrem('?pmrem')).toBeUndefined()
  expect(readPmrem('')).toBeUndefined()
})
