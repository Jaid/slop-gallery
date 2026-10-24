import type {GalleryDocument, Portrait} from './types.ts'

import artworks from '#level/artworks.ts'
import placement from '#level/placement.ts'

import {isSeed} from '../environmentSeed.ts'
import {galleryStorageKey} from '../level.ts'
import pauseMenu from '../pauseMenu.ts'
import {obstructionIssue, placementIssues, wallCoordinates, wallPosition} from '../placement/wallGeometry.ts'
import {isTemporary} from '../temporary.ts'
import {notify} from './actions.ts'
import {applySpawnBookmark} from './bookmarks.ts'
import {imageSize} from './ImageImporter.ts'
import {imageExtensions, maximumBackupBytes, validateCollectionImages, validateImage} from './imagePolicy.ts'
import {playerSession, validatePlayerPose} from './PlayerSession.ts'
import {createDocument, maximumPortraits, restoreDocument, useGallery} from './store.ts'

const images = new Set(artworks.map(p => p.source))
const narrations = new Set(artworks.map(p => p.narration).filter((p): p is string => typeof p === 'string'))
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const vector = (value: unknown, length: number) => Array.isArray(value) && value.length === length && value.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1000)
const shortText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max
const exactKeys = (value: Record<string, unknown>, keys: ReadonlyArray<string>) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
export function validateDocument(value: unknown): GalleryDocument {
  if (!object(value) || !exactKeys(value, ['version', 'portraits', 'player', 'savedAt', 'seed', 'settings']) || value.version !== 1 || !Array.isArray(value.portraits) || value.portraits.length > maximumPortraits || !object(value.settings)) {
    throw new Error('This is not a supported Slop Gallery collection.')
  }
  if (!shortText(value.savedAt, 100)) {
    throw new Error('The collection timestamp is too long.')
  }
  if (!isSeed(value.seed)) {
    throw new Error('The collection has an invalid environment seed.')
  }
  const settings = value.settings
  if (!exactKeys(settings, ['sound']) || typeof settings.sound !== 'boolean') {
    throw new TypeError('The collection has invalid settings.')
  }
  const ids = new Set<string>
  const portraits: Array<Portrait> = value.portraits.map((p: unknown) => {
    if (!object(p) || !shortText(p.id, 100) || !p.id || ids.has(p.id) || !shortText(p.title, 300) || !shortText(p.creator, 200) || !shortText(p.description, 5000) || !vector(p.position, 3) || typeof p.rotation !== 'number' || !Number.isFinite(p.rotation) || typeof p.hung !== 'boolean' || typeof p.width !== 'number' || typeof p.height !== 'number' || !(p.width >= 0.15 && p.width <= 4 && p.height >= 0.15 && p.height <= 4)) {
      throw new Error('The collection contains an invalid artwork.')
    }
    if (p.year !== undefined && !(typeof p.year === 'number' && Number.isSafeInteger(p.year))) {
      throw new Error('The artwork year is invalid.')
    }
    if (typeof p.wallId === 'string' && !shortText(p.wallId, 100)) {
      throw new Error('The artwork wall identifier is too long.')
    }
    ids.add(p.id)
    if (p.source instanceof Blob) {
      validateImage(p.source)
    } else if (typeof p.source !== 'string' || !images.has(p.source)) {
      throw new Error('The collection references an unknown image.')
    }
    if (p.narration !== undefined && (typeof p.narration !== 'string' || !narrations.has(p.narration))) {
      throw new Error('The narration asset is invalid.')
    }
    if (p.orientation !== undefined && (!vector(p.orientation, 4) || Math.abs(Math.hypot(...p.orientation as Array<number>) - 1) > 0.01)) {
      throw new Error('The artwork orientation is invalid.')
    }
    const wall = p.hung && typeof p.wallId === 'string' ? placement.wall(p.wallId) : undefined
    if (p.hung && (!wall || p.orientation)) {
      throw new Error('A hanging artwork has an invalid wall.')
    }
    if (wall) {
      const pos = p.position as Portrait['position']
      const expected = wallPosition(wall, wallCoordinates(wall, pos), pos[1])
      if (Math.hypot(...expected.map((n, i) => n - pos[i])) > 0.025 || Math.abs(Math.sin((p.rotation - wall.rotation) / 2)) > 0.001) {
        throw new Error('A hanging artwork is detached from its wall.')
      }
      const obstruction = obstructionIssue(wall, pos, p.width, p.height, p.labelAbove === true)
      if (obstruction) {
        throw new Error(obstruction === placementIssues.doorway ? 'A hanging artwork overlaps a doorway.' : 'A hanging artwork covers a reserved part of its wall.')
      }
    }
    if (!placement.contains(p.position as Portrait['position'])) {
      throw new Error('An artwork is outside the gallery.')
    }
    return {
      id: p.id,
      title: p.title,
      creator: p.creator,
      ...typeof p.year === 'number' ? {year: p.year} : {},
      description: p.description,
      source: p.source,
      position: p.position as Portrait['position'],
      rotation: p.rotation,
      width: p.width,
      height: p.height,
      hung: p.hung,
      ...p.labelAbove === true ? {labelAbove: true} : {},
      wallId: typeof p.wallId === 'string' ? p.wallId : undefined,
      orientation: p.orientation as Portrait['orientation'],
      narration: p.narration,
      imported: p.imported === true,
    }
  })
  validateCollectionImages(portraits)
  const player = validatePlayerPose(value.player)
  if (!player) {
    throw new Error('The collection has an invalid player pose.')
  }
  return {
    version: 1,
    seed: value.seed,
    portraits,
    player,
    savedAt: value.savedAt,
    settings: {
      sound: settings.sound,
    },
  }
}

/**
 * Lets the level settle the works of a stored collection, before validation, into its current walls and volume, which can change between visits in the halls. Returns the input itself if nothing moved, and malformed input untouched for validation to reject.
 */
function settleDocument(value: unknown): unknown {
  if (!object(value) || !Array.isArray(value.portraits)) {
    return value
  }
  const portraits = placement.settle(value.portraits as Array<unknown>)
  return portraits === value.portraits ? value : {
    ...value,
    portraits,
  }
}

export default class GalleryRepository {
  private database: Promise<IDBDatabase> | undefined
  /** the collection saved by a temporary repository, which never opens IndexedDB */
  private memory: GalleryDocument | null = null
  private writes = Promise.resolve()

  /** @param temporary keep the collection in memory instead of IndexedDB */
  constructor(private readonly temporary = false) {}

  async export(document = createDocument()) {
    document = validateDocument(document)
    const portraits = await Promise.all(document.portraits.map(async p => {
      if (p.source instanceof Blob) {
        const imageBytes = new Uint8Array(await p.source.arrayBuffer())
        return {
          ...p,
          source: {
            mime: p.source.type,
            data: imageBytes.toBase64(),
          },
        }
      }
      return {
        ...p,
        source: p.source,
      }
    }))
    const serialized = new Blob([
      JSON.stringify({
        ...document,
        portraits,
      }),
    ])
    if (serialized.size > maximumBackupBytes) {
      throw new Error('The collection backup is too large.')
    }
    const stream = serialized.stream().pipeThrough(new CompressionStream('gzip'))
    const compressedResponse = new Response(stream)
    const backup = await compressedResponse.blob()
    if (backup.size > maximumBackupBytes) {
      throw new Error('The compressed collection backup is too large.')
    }
    return backup
  }

  async import(file: Blob) {
    if (file.size > maximumBackupBytes) {
      throw new Error('Choose a collection no larger than 210 mb.')
    }
    const reader = file.stream().pipeThrough(new DecompressionStream('gzip')).getReader()
    const chunks: Array<Uint8Array<ArrayBuffer>> = []
    let total = 0
    try {
      for (;;) {
        const {done, value} = await reader.read()
        if (done) {
          break
        }
        total += value.byteLength
        if (total > maximumBackupBytes) {
          throw new Error('The unpacked collection is too large.')
        }
        chunks.push(new Uint8Array(value))
      }
    } finally {
      await reader.cancel().catch(() => {})
      reader.releaseLock()
    }
    const unpackedBackup = new Blob(chunks)
    const parsed: unknown = JSON.parse(await unpackedBackup.text())
    if (!object(parsed) || !Array.isArray(parsed.portraits)) {
      throw new Error('This is not a Slop Gallery collection.')
    }
    for (const p of parsed.portraits) {
      if (!object(p) || !object(p.source)) {
        continue
      }
      const {data, mime} = p.source
      if (typeof data !== 'string' || typeof mime !== 'string' || !Object.hasOwn(imageExtensions, mime)) {
        throw new Error('Invalid image data in collection.')
      }
      p.source = new Blob([Uint8Array.fromBase64(data)], {type: mime})
    }
    const document = validateDocument(settleDocument(parsed))
    // Decode every embedded image before replacing anything in the current collection.
    for (const p of document.portraits) {
      if (!(p.source instanceof Blob)) {
        continue
      }
      const bitmap = await createImageBitmap(p.source)
      try {
        imageSize(bitmap.width, bitmap.height)
      } finally {
        bitmap.close()
      }
    }
    return document
  }

  async load() {
    if (this.temporary) {
      return this.memory
    }
    const db = await this.open()
    const value = await new Promise<unknown>((resolve, reject) => {
      const transaction = db.transaction('collections', 'readonly')
      const request = transaction.objectStore('collections').get('current')
      request.addEventListener('success', () => resolve(request.result))
      request.addEventListener('error', () => reject(request.error))
    })
    return value === undefined ? null : validateDocument(settleDocument(value))
  }

  async save(document: GalleryDocument) {
    document = validateDocument(document)
    if (this.temporary) {
      this.memory = document
      return
    }
    const next = this.writes.catch(() => {}).then(async () => {
      const db = await this.open()
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('collections', 'readwrite', {durability: 'strict'})
        transaction.objectStore('collections').put(document, 'current')
        const rejectSave = () => reject(transaction.error ?? new Error('The gallery could not be saved.'))
        transaction.addEventListener('complete', () => resolve())
        transaction.addEventListener('abort', rejectSave)
        transaction.addEventListener('error', rejectSave)
      })
    })
    this.writes = next
    return next
  }

  private open() {
    if (this.database) {
      return this.database
    }
    let blocked = false
    const pending = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(galleryStorageKey, 1)
      request.addEventListener('upgradeneeded', () => request.result.createObjectStore('collections'))
      request.addEventListener('success', () => {
        // A previously blocked request can succeed after its caller has already failed.
        if (blocked) {
          request.result.close()
          return
        }
        request.result.addEventListener('versionchange', () => {
          request.result.close()
          if (this.database === pending) {
            this.database = undefined
          }
        })
        resolve(request.result)
      })
      request.addEventListener('error', () => reject(request.error))
      request.addEventListener('blocked', () => {
        blocked = true
        reject(new Error('Close the other gallery tabs to unlock storage.'))
      })
    })
    this.database = pending
    void pending.catch(() => {
      if (this.database === pending) {
        this.database = undefined
      }
    })
    return pending
  }
}

export const repository = new GalleryRepository(isTemporary)

export async function initializePersistence() {
  let fresh = false
  try {
    const saved = await repository.load()
    fresh = saved === null
    if (saved) {
      restoreDocument(saved)
    }
    const resumed = playerSession.resume(saved?.savedAt ?? '')
    applySpawnBookmark()
    pauseMenu.setGameData(saved !== null || resumed === true)
    useGallery.setState({
      saveStatus: 'saved',
      storageRecoveryRequired: false,
    })
  } catch {
    useGallery.setState({
      saveStatus: 'error',
      storageRecoveryRequired: true,
    })
    notify('Local storage could not be read. Automatic saving is paused to protect the stored collection.')
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let playerRevision = playerSession.revision
  const checkpoint = () => {
    if (useGallery.getState().storageRecoveryRequired) {
      return false
    }
    const saved = playerSession.checkpoint()
    if (saved) {
      playerRevision = playerSession.revision
    }
    return saved
  }
  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    if (useGallery.getState().storageRecoveryRequired) {
      return
    }
    const id = ++generation
    checkpoint()
    useGallery.setState({saveStatus: 'saving'})
    void repository.save(createDocument()).then(() => {
      if (id === generation && !timer) {
        useGallery.setState({saveStatus: 'saved'})
      }
    }).catch(() => {
      if (id !== generation || timer) {
        return
      }
      useGallery.setState({saveStatus: 'error'})
      notify('Local save failed. Changes in this session may not survive a reload.')
    })
  }
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(flush, 400)
    useGallery.setState({saveStatus: 'saving'})
  }
  const unsubscribe = useGallery.subscribe((s, previous) => {
    if (s.storageRecoveryRequired) {
      return
    }
    if (s.storageRecoveryRequired === previous.storageRecoveryRequired && s.portraits === previous.portraits && s.seed === previous.seed && s.sound === previous.sound && s.playerEpoch === previous.playerEpoch) {
      return
    }
    schedule()
  })
  // The seed is rolled once per game state, so a new game keeps it right away instead of rerolling on the next visit.
  if (fresh) {
    schedule()
  }
  // Do not rewrite a potentially large image collection every time the player moves.
  const playerTimer = setInterval(() => {
    if (playerSession.revision !== playerRevision && !checkpoint()) {
      flush()
    }
  }, 1000)
  const leaving = () => {
    const saved = checkpoint()
    if (timer || !saved && playerSession.revision !== playerRevision) {
      flush()
    }
  }
  const hidden = () => {
    if (document.visibilityState === 'hidden') {
      leaving()
    }
  }
  document.addEventListener('visibilitychange', hidden)
  document.defaultView?.addEventListener('pagehide', leaving)
  return () => {
    checkpoint()
    generation++
    unsubscribe()
    clearTimeout(timer)
    clearInterval(playerTimer)
    document.removeEventListener('visibilitychange', hidden)
    document.defaultView?.removeEventListener('pagehide', leaving)
  }
}
