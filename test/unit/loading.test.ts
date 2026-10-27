import {expect, test} from 'bun:test'

import {readLoading} from '../../src/lib/rendering/loading.ts'

test('?loading picks stream, full or lazy loading, stream by default', () => {
  expect(readLoading('')).toBe('stream')
  expect(readLoading('?loading=full')).toBe('full')
  expect(readLoading('?loading=lazy')).toBe('lazy')
  expect(readLoading('?loading=eager')).toBe('stream')
})
