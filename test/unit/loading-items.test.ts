import {expect, test} from 'bun:test'

import {counted, loadingItems, trackLoadingItems} from '#src/lib/loadingItems.ts'

test('loading items list every tracked source until it stops tracking', () => {
  expect(loadingItems()).toEqual([])
  let pipelines = 3
  const untrack = trackLoadingItems(() => counted(pipelines, 'pipelines compiling'))
  expect(loadingItems()).toEqual(['3 pipelines compiling'])
  pipelines = 0
  expect(loadingItems()).toEqual([])
  pipelines = 1
  untrack()
  expect(loadingItems()).toEqual([])
})
