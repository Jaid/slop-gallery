import {expect, test} from 'bun:test'

import {readLoading} from '../../src/lib/rendering/loading.ts'

test('?loading picks full, streamed or lazy loading, full by default', () => {
  expect(readLoading('')).toBe('full')
  expect(readLoading('?loading=streamed')).toBe('streamed')
  expect(readLoading('?loading=lazy')).toBe('lazy')
  expect(readLoading('?loading=eager')).toBe('full')
})
