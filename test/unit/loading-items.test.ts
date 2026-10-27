import {expect, test} from 'bun:test'

import {loadingItems, startLoading, trackLoadingItems} from '#src/lib/loadingItems.ts'

test('loading items list tracked sources and running loads by ID', () => {
  expect(loadingItems()).toEqual([])
  let pipelines = ['pipeline:a', 'pipeline:b']
  const untrack = trackLoadingItems(() => pipelines)
  const first = startLoading('artwork:x')
  const second = startLoading('artwork:x')
  expect(loadingItems()).toEqual(['artwork:x', 'pipeline:a', 'pipeline:b'])
  first()
  first()
  expect(loadingItems()).toEqual(['artwork:x', 'pipeline:a', 'pipeline:b'])
  second()
  pipelines = []
  expect(loadingItems()).toEqual([])
  pipelines = ['pipeline:c']
  untrack()
  expect(loadingItems()).toEqual([])
})
