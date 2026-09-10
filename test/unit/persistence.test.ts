import {afterEach, beforeEach, expect, spyOn, test} from 'bun:test'

import {IDBFactory} from 'fake-indexeddb'

import {initialPortraits} from '../../src/lib/gallery/collection.ts'
import {GalleryRepository, initializePersistence, repository, validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {maximumCollectionImageBytes, maximumImageBytes} from '../../src/lib/gallery/imagePolicy.ts'
import {PlayerSession, playerSession} from '../../src/lib/gallery/PlayerSession.ts'
import {createDocument, restoreDocument, useGallery} from '../../src/lib/gallery/store.ts'

const original = {
  ...createDocument(),
  portraits: initialPortraits.map(p => ({...p})),
}
const previous = {
  indexedDB: globalThis.indexedDB,
  document: globalThis.document,
  createImageBitmap: globalThis.createImageBitmap,
}
test('old north-wall collections follow the extension once, including custom hanging positions', () => {
  const north = initialPortraits.filter(portrait => portrait.wallId === 'daydream-north')
  const custom = {
    ...north[0]!,
    id: 'custom',
    position: [-5, 2.8, -7.78],
  }
  const legacy = {
    ...original,
    portraits: [
      ...north.map(portrait => ({
        ...portrait,
        position: [portrait.position[0], portrait.position[1], -7.78],
      })),
      custom,
      {
        ...custom,
        id: 'loose',
        hung: false,
      },
    ],
  }
  const migrated = validateDocument(legacy)
  expect(migrated.portraits.slice(0, north.length)).toMatchObject(north)
  expect(migrated.portraits[north.length]!.position).toEqual([-5, 2.8, -31.78])
  expect(migrated.portraits[north.length + 1]!.position).toEqual([-5, 2.8, -7.78])
  expect(validateDocument(migrated)).toEqual(migrated)
  expect(() => validateDocument({
    ...legacy,
    portraits: [
      {
        ...custom,
        position: [-5, 2.8, -7],
      },
    ],
  })).toThrow('detached')
})
let cleanup: (() => void) | undefined
let loadSpy: ReturnType<typeof spyOn<typeof repository, 'load'>> | undefined
let saveSpy: ReturnType<typeof spyOn<typeof repository, 'save'>> | undefined
beforeEach(() => {
  restoreDocument(original)
  useGallery.setState({
    sound: false,
    storageRecoveryRequired: false,
  })
  Object.assign(globalThis, {
    indexedDB: new IDBFactory,
    document: Object.assign(new EventTarget, {visibilityState: 'visible'}),
    createImageBitmap: async () => ({
      width: 64,
      height: 64,
      close() {},
    }),
  })
})
afterEach(() => {
  cleanup?.()
  cleanup = undefined
  loadSpy?.mockRestore()
  saveSpy?.mockRestore()
  Object.assign(globalThis, previous)
})
test('the aggregate boundary round-trips through store, IndexedDB and compressed backup', async () => {
  const source = new Blob([new Uint8Array(maximumImageBytes)], {type: 'image/webp'})
  const portraits = initialPortraits.slice(0, maximumCollectionImageBytes / maximumImageBytes).map(p => ({
    ...p,
    source,
  }))
  useGallery.getState().commit(portraits)
  const document = createDocument()
  const repo = new GalleryRepository
  await repo.save(document)
  const loaded = (await repo.load())!
  expect(loaded.player).toEqual(document.player)
  expect(loaded.portraits.map(p => (p.source as Blob).size)).toEqual(portraits.map(() => source.size))
  const backup = await repo.export(document)
  const imported = await repo.import(backup)
  expect(imported.player).toEqual(document.player)
  expect(imported.portraits.map(p => (p.source as Blob).size)).toEqual(portraits.map(() => source.size))
  expect(validateDocument(imported)).toEqual(imported)
  restoreDocument(imported)
  expect(createDocument().portraits).toHaveLength(portraits.length)
}, 30_000)
test('one byte beyond the aggregate limit is rejected by every admission and serialization boundary', async () => {
  const source = new Blob([new Uint8Array(maximumImageBytes)], {type: 'image/png'})
  const portraits = initialPortraits.slice(0, 6).map(p => ({
    ...p,
    source,
  }))
  useGallery.getState().commit(portraits)
  const extra = {
    ...initialPortraits[6]!,
    source: new Blob(['x'], {type: 'image/png'}),
  }
  const invalid = {
    ...createDocument(),
    portraits: [...portraits, extra],
  }
  expect(() => useGallery.getState().add(extra)).toThrow('150')
  expect(() => useGallery.getState().commit(invalid.portraits)).toThrow('150')
  expect(() => restoreDocument(invalid)).toThrow('150')
  expect(() => validateDocument(invalid)).toThrow('150')
  const repo = new GalleryRepository
  await expect(repo.save(invalid)).rejects.toThrow('150')
  await expect(repo.export(invalid)).rejects.toThrow('150')
  expect(await repo.load()).toBeNull()
  expect(useGallery.getState().portraits).toHaveLength(6)
  useGallery.getState().commit([...portraits, initialPortraits[6]!])
  expect(() => useGallery.getState().update(extra.id, {source: extra.source})).toThrow('150')
})
test('a failed load protects the stored record until explicit recovery', async () => {
  loadSpy = spyOn(repository, 'load').mockRejectedValue(new Error('Unreadable saved record'))
  saveSpy = spyOn(repository, 'save').mockResolvedValue()
  cleanup = await initializePersistence()
  useGallery.setState({
    theme: 'sage',
    sound: true,
  })
  await Bun.sleep(450)
  expect(saveSpy).not.toHaveBeenCalled()
  expect(useGallery.getState()).toMatchObject({
    saveStatus: 'error',
    storageRecoveryRequired: true,
  })
  useGallery.setState({storageRecoveryRequired: false})
  await Bun.sleep(450)
  expect(saveSpy).toHaveBeenCalledTimes(1)
  expect(saveSpy.mock.calls[0]![0].settings.theme).toBe('sage')
  expect(useGallery.getState().saveStatus).toBe('saved')
})
test('save strips runtime ownership before structured cloning', async () => {
  const repo = new GalleryRepository
  await repo.save({
    ...original,
    portraits: [
      {
        ...initialPortraits[0]!,
        mergeJob: Symbol(),
        flavorJob: Symbol(),
        pending: true,
      },
    ],
  })
  const loaded = await repo.load()
  expect(loaded?.portraits[0]).not.toHaveProperty('mergeJob')
  expect(loaded?.portraits[0]).not.toHaveProperty('pending')
})
test('import rejects an oversized document even when gzip compresses it below the file limit', async () => {
  const encoded = new Uint8Array(maximumImageBytes).toBase64()
  const portraits = initialPortraits.slice(0, 7).map((p, i) => ({
    ...p,
    source: {
      mime: 'image/png',
      data: i < 6 ? encoded : 'eA==',
    },
  }))
  const stream = new Blob([
    JSON.stringify({
      ...original,
      portraits,
    }),
  ]).stream().pipeThrough(new CompressionStream('gzip'))
  const backup = await new Response(stream).blob()
  await expect((new GalleryRepository).import(backup)).rejects.toThrow('150')
  expect(useGallery.getState().portraits.map(p => p.id)).toEqual(original.portraits.map(p => p.id))
}, 30_000)
test('recovery can retry storage after a transient open failure', async () => {
  const request = {
    onerror: null as (() => void) | null,
    error: new Error('Storage unavailable'),
  }
  const open = spyOn(indexedDB, 'open').mockImplementationOnce(() => {
    queueMicrotask(() => request.onerror?.())
    return request as unknown as IDBOpenDBRequest
  })
  try {
    const repo = new GalleryRepository
    await expect(repo.load()).rejects.toThrow('Storage unavailable')
    await repo.save(original)
    expect((await repo.load())?.portraits.map(p => p.id)).toEqual(original.portraits.map(p => p.id))
  } finally {
    open.mockRestore()
  }
})
test('metadata limits leave room for image encoding in every exported collection', () => {
  expect(() => validateDocument({
    ...original,
    savedAt: 'x'.repeat(101),
  })).toThrow('timestamp')
  expect(() => validateDocument({
    ...original,
    portraits: [
      {
        ...initialPortraits[0]!,
        hung: false,
        wallId: 'x'.repeat(101),
      },
    ],
  })).toThrow('wall identifier')
})
test('retired motion settings are ignored in saved collections', () => {
  const document = createDocument()
  expect(document.settings).not.toHaveProperty('motion')
  for (const motion of [true, false]) {
    const loaded = validateDocument({
      ...document,
      settings: {
        ...document.settings,
        motion,
      },
    })
    expect(loaded.settings).toEqual(document.settings)
    restoreDocument(loaded)
    expect(useGallery.getState()).not.toHaveProperty('motion')
    expect(createDocument().settings).toEqual(document.settings)
  }
})
test('movement checkpoints flush synchronously on refresh without rewriting artwork, and detach cleanly', async () => {
  const names = ['localStorage'] as const
  const descriptors = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name))
  const storage = new Map<string, string>
  const page = new EventTarget
  Object.assign(document, {defaultView: page})
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  })
  loadSpy = spyOn(repository, 'load').mockResolvedValue({
    ...original,
    savedAt: '2026-01-01T00:00:00Z',
  })
  saveSpy = spyOn(repository, 'save').mockResolvedValue()
  try {
    cleanup = await initializePersistence()
    const pose = {
      position: [-33, -4.98, -20] as [number, number, number],
      yaw: 1.2,
    }
    playerSession.capture(pose)
    page.dispatchEvent(new Event('pagehide'))
    const refreshed = new PlayerSession
    refreshed.resume('2026-01-01T00:00:00Z')
    expect(refreshed.snapshot().position).toEqual(pose.position)
    expect(refreshed.snapshot().yaw).toBeCloseTo(pose.yaw)
    expect(saveSpy).not.toHaveBeenCalled()
    playerSession.capture({
      ...pose,
      yaw: -0.6,
    })
    await Bun.sleep(1100)
    refreshed.resume('2026-01-01T00:00:00Z')
    expect(refreshed.snapshot().yaw).toBeCloseTo(-0.6)
    expect(saveSpy).not.toHaveBeenCalled()
    useGallery.setState({storageRecoveryRequired: true})
    const protectedCheckpoint = storage.get('slop-gallery-player')
    playerSession.capture({
      ...pose,
      yaw: 0.9,
    })
    page.dispatchEvent(new Event('pagehide'))
    expect(storage.get('slop-gallery-player')).toBe(protectedCheckpoint)
    cleanup()
    cleanup = undefined
    useGallery.setState({storageRecoveryRequired: false})
    playerSession.capture({
      ...pose,
      yaw: 0.3,
    })
    page.dispatchEvent(new Event('pagehide'))
    expect(storage.get('slop-gallery-player')).toBe(protectedCheckpoint)
  } finally {
    cleanup?.()
    cleanup = undefined
    for (const [i, name] of names.entries()) {
      const descriptor = descriptors[i]
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor)
      } else {
        Reflect.deleteProperty(globalThis, name)
      }
    }
  }
})
