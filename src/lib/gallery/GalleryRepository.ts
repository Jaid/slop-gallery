import type {GalleryDocument, Portrait} from './types.ts'

import {notify} from './actions.ts'
import {initialPortraits} from './collection.ts'
import {imageSize} from './ImageImporter.ts'
import {imageExtensions, maximumBackupBytes, validateCollectionImages, validateImage} from './imagePolicy.ts'
import {migratePortrait} from './migratePortrait.ts'
import {moonfallRecovery} from './moonfall/config.ts'
import {playerSession, playerSpawn, validatePlayerPose} from './PlayerSession.ts'
import {createDocument, maximumPortraits, restoreDocument, useGallery} from './store.ts'
import {insideGallery, placementIssue, wallCoordinates, wallPosition, walls} from './walls.ts'

const images = new Set(initialPortraits.map(p => p.source).filter((p): p is string => typeof p === 'string'))
const narrations = new Set(initialPortraits.map(p => p.narration).filter((p): p is string => typeof p === 'string'))
// Retired recordings remain valid in saved collections but no longer play.
const retiredNarrations = new Set(['/audio/doge.opus'])
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const vector = (value: unknown, length: number) => Array.isArray(value) && value.length === length && value.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1000)
const shortText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max

export function validateDocument(value: unknown): GalleryDocument {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.portraits) || value.portraits.length > maximumPortraits || !object(value.settings)) {
    throw new Error('This is not a supported Slop Gallery collection.')
  }
  if (typeof value.savedAt === 'string' && !shortText(value.savedAt, 100)) {
    throw new Error('The collection timestamp is too long.')
  }
  const settings = value.settings
  if (!['ivory', 'sage', 'nocturne'].includes(String(settings.theme)) || !['gold', 'oak', 'black'].includes(String(settings.frame)) || typeof settings.sound !== 'boolean') {
    throw new Error('The collection has invalid settings.')
  }
  const ids = new Set<string>
  const portraits: Array<Portrait> = value.portraits.map((value: unknown) => {
    const p = object(value) ? migratePortrait(value) : value
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
    if (p.narration !== undefined && (typeof p.narration !== 'string' || !narrations.has(p.narration) && !retiredNarrations.has(p.narration))) {
      throw new Error('The narration asset is invalid.')
    }
    if (p.orientation !== undefined && (!vector(p.orientation, 4) || Math.abs(Math.hypot(...p.orientation as Array<number>) - 1) > 0.01)) {
      throw new Error('The artwork orientation is invalid.')
    }
    if (p.hung && (!walls.some(wall => wall.id === p.wallId) || p.orientation)) {
      throw new Error('A hanging artwork has an invalid wall.')
    }
    let displaced: Portrait['position'] | undefined
    if (p.hung) {
      const wall = walls.find(w => w.id === p.wallId)!
      const pos = p.position as Portrait['position']
      const expected = wallPosition(wall, wallCoordinates(wall, pos), pos[1])
      if (Math.hypot(...expected.map((n, i) => n - pos[i]!)) > 0.025 || Math.abs(Math.sin((p.rotation - wall.rotation) / 2)) > 0.001) {
        throw new Error('A hanging artwork is detached from its wall.')
      }
      if (object(value) && placementIssue(wall, pos, p.width, p.height, []) === 'Let’s keep the doorway clear.') {
        if (value.wallId === 'secret-east') {
          displaced = [0, 0.2, 11.5]
        } else if (wall.room === 'moonfall' && Array.isArray(value.position) && value.position[0] >= 12) {
          displaced = [...moonfallRecovery]
        } else if (wall.id === 'lobby-north') {
          displaced = [0, 0.2, -28]
        } else if (wall.id === 'sienna-west') {
          displaced = [-14, 0.2, 17]
        } else if (wall.id === 'oculus-north') {
          displaced = [0, -4.8, -28.5]
        } else if (wall.id === 'lodge-west') {
          displaced = [-25, -4.8, -28.5]
        }
      }
    }
    if (!insideGallery(p.position as Portrait['position'])) {
      throw new Error('An artwork is outside the gallery.')
    }
    const bundled = initialPortraits.find(defaultPortrait => defaultPortrait.id === p.id && defaultPortrait.source === p.source && defaultPortrait.title === p.title && defaultPortrait.description === p.description)
    const narration = p.narration === undefined ? bundled?.narration : p.narration
    return {
      id: p.id,
      title: p.title,
      creator: p.creator,
      ...typeof p.year === 'number' ? {year: p.year} : {},
      description: p.description,
      source: p.source,
      // Lay legacy frames displaced by a new portal safely inside their room.
      position: displaced ?? p.position as Portrait['position'],
      rotation: p.rotation,
      width: p.width,
      height: p.height,
      hung: p.hung && !displaced,
      wallId: typeof p.wallId === 'string' ? p.wallId : undefined,
      orientation: displaced ? [Math.SQRT1_2, 0, 0, Math.SQRT1_2] : p.orientation as Portrait['orientation'],
      narration: typeof narration === 'string' && narrations.has(narration) ? narration : undefined,
      imported: p.imported === true,
    }
  })
  validateCollectionImages(portraits)
  return {
    version: 1,
    portraits,
    player: validatePlayerPose(value.player) ?? {
      position: [...playerSpawn.position],
      yaw: playerSpawn.yaw,
      pitch: playerSpawn.pitch,
    },
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : '',
    settings: {
      theme: settings.theme as GalleryDocument['settings']['theme'],
      frame: settings.frame as GalleryDocument['settings']['frame'],
      sound: settings.sound,
    },
  }
}

export class GalleryRepository {
  private database: Promise<IDBDatabase> | undefined
  private writes = Promise.resolve()

  async export(document = createDocument()) {
    document = validateDocument(document)
    const portraits = await Promise.all(document.portraits.map(async p => ({
      ...p,
      source: p.source instanceof Blob ? {
        mime: p.source.type,
        data: new Uint8Array(await p.source.arrayBuffer()).toBase64(),
      } : p.source,
    })))
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
    const backup = await new Response(stream).blob()
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
    const parsed: unknown = JSON.parse(await new Blob(chunks).text())
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
    const document = validateDocument(parsed)
    // Decode every embedded image before replacing anything in the current collection.
    for (const p of document.portraits) {
      if (p.source instanceof Blob) {
        const bitmap = await createImageBitmap(p.source)
        try {
          imageSize(bitmap.width, bitmap.height)
        } finally {
          bitmap.close()
        }
      }
    }
    return document
  }

  async load() {
    const db = await this.open()
    const value = await new Promise<unknown>((resolve, reject) => {
      const transaction = db.transaction('collections', 'readonly')
      const request = transaction.objectStore('collections').get('current')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return value === undefined ? null : validateDocument(value)
  }

  async save(document: GalleryDocument) {
    document = validateDocument(document)
    const next = this.writes.catch(() => {}).then(async () => {
      const db = await this.open()
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('collections', 'readwrite', {durability: 'strict'})
        transaction.objectStore('collections').put(document, 'current')
        transaction.oncomplete = () => resolve()
        transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('The gallery could not be saved.'))
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
      const request = indexedDB.open('slop-gallery', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('collections')
      request.onsuccess = () => {
        // A previously blocked request can succeed after its caller has already failed.
        if (blocked) {
          request.result.close()
          return
        }
        request.result.onversionchange = () => {
          request.result.close()
          if (this.database === pending) {
            this.database = undefined
          }
        }
        resolve(request.result)
      }
      request.onerror = () => reject(request.error)
      request.onblocked = () => {
        blocked = true
        reject(new Error('Close the other gallery tabs to unlock storage.'))
      }
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

export const repository = new GalleryRepository

export async function initializePersistence() {
  try {
    const saved = await repository.load()
    if (saved) {
      restoreDocument(saved)
    }
    playerSession.resume(saved?.savedAt ?? '')
    useGallery.setState({
      saveStatus: 'saved',
      storageRecoveryRequired: false,
    })
  } catch {
    useGallery.setState({
      saveStatus: 'error',
      storageRecoveryRequired: true,
    })
    notify('Local storage could not be read. The stored record is protected. Export your current collection or choose recovery in Settings.')
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
      notify('Local save failed. Export your collection from Settings to keep a backup.')
    })
  }
  const unsubscribe = useGallery.subscribe((s, previous) => {
    if (s.storageRecoveryRequired) {
      return
    }
    if (s.storageRecoveryRequired === previous.storageRecoveryRequired && s.portraits === previous.portraits && s.theme === previous.theme && s.frame === previous.frame && s.sound === previous.sound && s.playerEpoch === previous.playerEpoch) {
      return
    }
    clearTimeout(timer)
    timer = setTimeout(flush, 400)
    useGallery.setState({saveStatus: 'saving'})
  })
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
