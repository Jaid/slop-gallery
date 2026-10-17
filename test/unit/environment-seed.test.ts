import {afterEach, beforeEach, expect, test} from 'bun:test'

import {IDBFactory} from 'fake-indexeddb'

import {effectiveSeed, environmentPick, environmentRoll, isSeed, maximumSeed, parseSeed, readSeedOverride, rollSeed} from '../../src/lib/environmentSeed.ts'
import {resetGallery} from '../../src/lib/gallery/actions.ts'
import initialPortraits from '../../src/lib/gallery/collection.ts'
import GalleryRepository, {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {potPlacements, pottedPlantKind, pottedPlantKinds} from '../../src/lib/gallery/plantDecorations/placements.ts'
import {createDocument, restoreDocument, undo, useGallery} from '../../src/lib/gallery/store.ts'

const previousIndexedDB = globalThis.indexedDB
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory
  restoreDocument({
    ...createDocument(),
    portraits: initialPortraits.map(p => ({...p})),
    seed: 1,
  })
})
afterEach(() => {
  globalThis.indexedDB = previousIndexedDB
})
test('?seed accepts unsigned 32-bit integers and ignores anything else', () => {
  expect(readSeedOverride('?seed=1')).toBe(1)
  expect(readSeedOverride('https://slop.gallery/?graphics=fast&seed=0')).toBe(0)
  expect(readSeedOverride(`?seed=${maximumSeed}`)).toBe(maximumSeed)
  for (const value of ['', 'abc', '-1', '1.5', '1e3', String(maximumSeed + 1), ' 1']) {
    expect(readSeedOverride(`?seed=${encodeURIComponent(value)}`)).toBeUndefined()
  }
  expect(readSeedOverride('?seed')).toBeUndefined()
  expect(readSeedOverride('')).toBeUndefined()
  expect(parseSeed(7)).toBe(7)
  expect(isSeed(7)).toBe(true)
  expect(isSeed('7')).toBe(false)
  expect(isSeed(-1)).toBe(false)
})
test('an override suppresses rolling and wins over the stored seed', () => {
  expect(rollSeed(5)).toBe(5)
  expect(effectiveSeed(9, 5)).toBe(5)
  expect(effectiveSeed(9, undefined)).toBe(9)
  const rolled = Array.from({length: 8}, () => rollSeed(undefined))
  expect(rolled.every(isSeed)).toBe(true)
  const distinct = new Set(rolled)
  expect(distinct.size).toBeGreaterThan(1)
})
test('rolls depend only on seed and ID, never on call order', () => {
  const ids = potPlacements.map(placement => placement.id)
  const forward = ids.map(id => environmentRoll(1, id))
  const backward = ids.toReversed().map(id => environmentRoll(1, id)).toReversed()
  expect(backward).toEqual(forward)
  for (const roll of forward) {
    expect(roll).toBeGreaterThanOrEqual(0)
    expect(roll).toBeLessThan(1)
  }
  expect(environmentRoll(2, ids[0])).not.toBe(environmentRoll(1, ids[0]))
  expect(() => environmentPick(1, 'empty', [])).toThrow()
})
test('rolls spread evenly over seeds and over IDs', () => {
  const buckets = (rolls: Array<number>) => {
    const counts = Array.from({length: 10}, () => 0)
    for (const roll of rolls) {
      counts[Math.floor(roll * 10)]++
    }
    return counts
  }
  const bySeed = buckets(Array.from({length: 20_000}, (_, seed) => environmentRoll(seed, potPlacements[0].id)))
  const byId = buckets(Array.from({length: 20_000}, (_, index) => environmentRoll(1, `spot-${index}`)))
  for (const count of [...bySeed, ...byId]) {
    expect(count).toBeGreaterThan(1800)
    expect(count).toBeLessThan(2200)
  }
})
test('every pot placement can grow every plant, and seed 1 stays put', () => {
  for (const placement of potPlacements) {
    const grown = new Set(Array.from({length: 500}, (_, seed) => pottedPlantKind(seed, placement.id)))
    expect(grown).toEqual(new Set(pottedPlantKinds))
  }
  // Captures from snap.ts and film.ts default to seed 1; a change here changes every one of them.
  expect(potPlacements.map(placement => pottedPlantKind(1, placement.id))).toEqual(['philodendron', 'rubber', 'fig', 'peaceLily'])
})
test('the seed is saved, restored and validated with the collection', async () => {
  useGallery.setState({seed: 123_456})
  const document = createDocument()
  expect(document.seed).toBe(123_456)
  const repository = new GalleryRepository
  await repository.save(document)
  useGallery.setState({seed: 1})
  restoreDocument((await repository.load())!)
  expect(useGallery.getState().seed).toBe(123_456)
  const backup = await repository.export(document)
  const imported = await repository.import(backup)
  expect(imported.seed).toBe(123_456)
  for (const seed of [-1, 1.5, maximumSeed + 1, '1', null]) {
    expect(() => validateDocument({
      ...document,
      seed,
    })).toThrow('seed')
  }
})
test('collections from before seeds existed roll one once', () => {
  const {seed: _, ...legacy} = createDocument()
  expect(validateDocument(legacy)).not.toHaveProperty('seed')
  restoreDocument(legacy)
  const {seed} = useGallery.getState()
  expect(isSeed(seed)).toBe(true)
  expect(createDocument().seed).toBe(seed)
})
test('a new game rolls a new seed, and undo brings the previous environment back', () => {
  useGallery.setState({seed: 77})
  const seeds = new Set<number>
  for (let attempt = 0; attempt < 4; attempt++) {
    resetGallery()
    seeds.add(useGallery.getState().seed)
  }
  expect(seeds.size).toBeGreaterThan(1)
  for (let attempt = 0; attempt < 4; attempt++) {
    undo()
  }
  expect(useGallery.getState().seed).toBe(77)
  useGallery.getState().add({
    ...initialPortraits[0],
    id: 'seed-test',
  })
  expect(useGallery.getState().seed).toBe(77)
})
