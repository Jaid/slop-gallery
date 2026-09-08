import type {AiSettings} from '../../src/lib/ai/settings.ts'
import type {Portrait} from '../../src/lib/gallery/types.ts'

import {beforeEach, expect, test} from 'bun:test'

import {GalleryDirector} from '../../src/lib/ai/GalleryDirector.ts'
import {parameterParsers} from '../../src/lib/ai/settings.ts'
import {initialPortraits} from '../../src/lib/gallery/collection.ts'
import {createDocument, restoreDocument, undo, useGallery} from '../../src/lib/gallery/store.ts'

const defaults = Object.fromEntries(Object.entries(parameterParsers).map(([key, parser]) => [key, parser.defaultValue])) as AiSettings
const original = {
  ...createDocument(),
  portraits: initialPortraits.map(p => ({...p})),
  secretOpen: false,
}
const a = new Blob(['hanging'], {type: 'image/webp'})
const b = new Blob(['thrown'], {type: 'image/webp'})
beforeEach(() => {
  restoreDocument(original)
  useGallery.setState({
    sound: false,
    portraits: original.portraits.slice(0, 2).map((p, i) => ({
      ...p,
      id: i ? 'b' : 'a',
      source: i ? b : a,
      hung: !i,
      wallId: i ? undefined : p.wallId,
    })),
  })
})
class TestDirector extends GalleryDirector {
  flavorResult = Promise.withResolvers<Partial<Portrait>>()
  partial: ((partial: Partial<Portrait>) => void) | undefined
  received: Array<Portrait['source']> = []
  result = Promise.withResolvers<Blob>()
  protected override generateFlavor(_image: Blob, partial: (partial: Partial<Portrait>) => void) {
    this.partial = partial
    return this.flavorResult.promise
  }
  protected override generateMerge(first: Portrait['source'], second: Portrait['source']) {
    this.received = [first, second]
    return this.result.promise
  }
}
test('fusion keeps both originals until success and commits one undoable change', async () => {
  const director = new TestDirector({
    ...defaults,
    ai: false,
  }, '')
  const job = director.merge('a', 'b')
  expect(director.received).toEqual([a, b])
  expect(useGallery.getState().portraits).toHaveLength(2)
  const merged = new Blob(['result'], {type: 'image/webp'})
  director.result.resolve(merged)
  await job
  expect(useGallery.getState().portraits).toHaveLength(1)
  expect(useGallery.getState().portraits[0]!.source).toBe(merged)
  expect(undo()).toBe(true)
  expect(useGallery.getState().portraits.map(p => p.source)).toEqual([a, b])
  director.dispose()
})
test('failed fusion releases both originals', async () => {
  const director = new TestDirector(defaults, 'test')
  const job = director.merge('a', 'b')
  director.result.reject(new Error('Provider unavailable'))
  await job
  expect(useGallery.getState().portraits.map(p => p.source)).toEqual([a, b])
  expect(useGallery.getState().portraits.some(p => p.merging || p.reserved)).toBe(false)
  director.dispose()
})
test('removing one original releases the survivor and ignores late success', async () => {
  const director = new TestDirector(defaults, 'test')
  const job = director.merge('a', 'b')
  useGallery.getState().remove('a')
  director.result.resolve(new Blob(['late']))
  await job
  expect(useGallery.getState().portraits).toHaveLength(1)
  expect(useGallery.getState().portraits[0]).toMatchObject({
    id: 'b',
    reserved: false,
  })
  director.dispose()
})
test('canceling a director prevents late changes', async () => {
  const director = new TestDirector(defaults, 'test')
  const job = director.merge('a', 'b')
  director.dispose()
  director.result.resolve(new Blob(['late']))
  await job
  expect(useGallery.getState().portraits.map(p => p.source)).toEqual([a, b])
})
test('streamed labels never overwrite a subsequent manual edit', async () => {
  const director = new TestDirector(defaults, 'test')
  const job = director.flavor(useGallery.getState().portraits[0]!)
  await Promise.resolve()
  director.partial?.({title: 'Streaming title'})
  expect(useGallery.getState().portraits[0]!.title).toBe('Streaming title')
  useGallery.getState().update('a', {
    title: 'My label',
    pending: false,
  })
  director.partial?.({title: 'Late stream'})
  director.flavorResult.resolve({title: 'Late final'})
  await job
  expect(useGallery.getState().portraits[0]!.title).toBe('My label')
  director.dispose()
})
