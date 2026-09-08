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
test('streamed artwork years are retained and invalid provider years are ignored', async () => {
  const director = new TestDirector(defaults, 'test')
  try {
    const job = director.flavor(useGallery.getState().portraits[0]!)
    await Promise.resolve()
    director.partial?.({year: 1924})
    expect(useGallery.getState().portraits[0]!.year).toBe(1924)
    director.partial?.({year: 1924.5})
    expect(useGallery.getState().portraits[0]!.year).toBe(1924)
    director.partial?.({year: Infinity})
    expect(useGallery.getState().portraits[0]!.year).toBe(1924)
    director.flavorResult.resolve({year: 1925})
    await job
    expect(createDocument().portraits[0]!.year).toBe(1925)
  } finally {
    director.dispose()
  }
})
test('obsolete merge cleanup cannot cancel its replacement', async () => {
  const old = new TestDirector({
    ...defaults,
    ai: false,
  }, '')
  const obsolete = old.merge('a', 'b')
  old.dispose()
  const replacement = new TestDirector({
    ...defaults,
    ai: false,
  }, '')
  try {
    const job = replacement.merge('a', 'b')
    old.result.resolve(new Blob(['obsolete'], {type: 'image/webp'}))
    await obsolete
    expect(useGallery.getState().portraits[0]!.merging).toBe(true)
    expect(useGallery.getState().portraits[1]!.reserved).toBe(true)
    const merged = new Blob(['replacement'], {type: 'image/webp'})
    replacement.result.resolve(merged)
    await job
    expect(useGallery.getState().portraits.map(p => p.source)).toEqual([merged])
  } finally {
    replacement.dispose()
  }
})
test('disposing a different director does not release another director’s label or merge', async () => {
  const owner = new TestDirector(defaults, 'test')
  const unrelated = new TestDirector(defaults, 'test')
  const job = owner.merge('a', 'b')
  unrelated.dispose()
  expect(useGallery.getState().portraits[0]!.merging).toBe(true)
  owner.result.reject(new Error('test'))
  await job
  owner.dispose()
})
test('generated image admission failure preserves both originals', async () => {
  const director = new TestDirector({
    ...defaults,
    ai: false,
  }, '')
  try {
    const job = director.merge('a', 'b')
    director.result.resolve(new Blob([new Uint8Array(25_000_001)], {type: 'image/webp'}))
    await job
    expect(useGallery.getState().portraits.map(p => p.source)).toEqual([a, b])
    expect(useGallery.getState().portraits.some(p => p.merging || p.reserved)).toBe(false)
  } finally {
    director.dispose()
  }
})
