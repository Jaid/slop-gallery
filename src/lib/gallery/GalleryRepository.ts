import type {GalleryDocument, Portrait} from './types.ts'

import {notify} from './actions.ts'
import {initialPortraits} from './collection.ts'
import {imageSize} from './ImageImporter.ts'
import {createDocument, maximumPortraits, restoreDocument, useGallery} from './store.ts'
import {wallCoordinates, wallPosition, walls} from './walls.ts'

const imageTypes = new Set(['image/webp', 'image/png', 'image/jpeg', 'image/avif', 'image/gif'])
const images = new Set(initialPortraits.map(p => p.source).filter((p): p is string => typeof p === 'string'))
const narrations = new Set(initialPortraits.map(p => p.narration).filter((p): p is string => typeof p === 'string'))
// Retired recordings remain valid in saved collections but no longer play.
const retiredNarrations = new Set(['/audio/doge.opus'])
const maxBytes = 150_000_000
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const vector = (value: unknown, length: number) => Array.isArray(value) && value.length === length && value.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1000)
const shortText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max

export function validateDocument(value: unknown): GalleryDocument {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.portraits) || value.portraits.length > maximumPortraits || !object(value.settings)) {
    throw new Error('This is not a supported Slop Gallery collection.')
  }
  const settings = value.settings
  if (!['ivory', 'sage', 'nocturne'].includes(String(settings.theme)) || !['gold', 'oak', 'black'].includes(String(settings.frame)) || typeof settings.sound !== 'boolean' || typeof settings.motion !== 'boolean') {
    throw new Error('The collection has invalid settings.')
  }
  const ids = new Set<string>
  let bytes = 0
  const portraits: Array<Portrait> = value.portraits.map(p => {
    if (!object(p) || !shortText(p.id, 100) || !p.id || ids.has(p.id) || !shortText(p.title, 300) || !shortText(p.creator, 200) || !shortText(p.description, 5000) || !vector(p.position, 3) || typeof p.rotation !== 'number' || !Number.isFinite(p.rotation) || typeof p.hung !== 'boolean' || typeof p.width !== 'number' || typeof p.height !== 'number' || !(p.width >= 0.15 && p.width <= 4 && p.height >= 0.15 && p.height <= 4)) {
      throw new Error('The collection contains an invalid artwork.')
    }
    ids.add(p.id)
    if (p.source instanceof Blob) {
      bytes += p.source.size
      if (!imageTypes.has(p.source.type) || p.source.size > 25_000_000 || bytes > maxBytes) {
        throw new Error('The collection contains an unsupported or oversized image.')
      }
    } else if (typeof p.source !== 'string' || !images.has(p.source)) {
      throw new Error('The collection references an unknown image.')
    }
    if (p.narration !== undefined && (typeof p.narration !== 'string' || (!narrations.has(p.narration) && !retiredNarrations.has(p.narration)))) {
      throw new Error('The narration asset is invalid.')
    }
    if (p.orientation !== undefined && (!vector(p.orientation, 4) || Math.abs(Math.hypot(...p.orientation as Array<number>) - 1) > 0.01)) {
      throw new Error('The artwork orientation is invalid.')
    }
    if (p.hung && (!walls.some(wall => wall.id === p.wallId) || p.orientation)) {
      throw new Error('A hanging artwork has an invalid wall.')
    }
    if (p.hung) {
      const wall = walls.find(w => w.id === p.wallId)!
      const pos = p.position as Portrait['position']
      const expected = wallPosition(wall, wallCoordinates(wall, pos), pos[1])
      if (Math.hypot(...expected.map((n, i) => n - pos[i]!)) > 0.025 || Math.abs(Math.sin((p.rotation - wall.rotation) / 2)) > 0.001) {
        throw new Error('A hanging artwork is detached from its wall.')
      }
    }
    const [x, y, z] = p.position as Array<number>
    if (Math.abs(x!) > 20 || z! < -8 || z! > 15 || y! < -1 || y! > 6 || z! > 8 && Math.abs(x!) > 4) {
      throw new Error('An artwork is outside the gallery.')
    }
    return {
      id: p.id,
      title: p.title,
      creator: p.creator,
      description: p.description,
      source: p.source,
      position: p.position as Portrait['position'],
      rotation: p.rotation,
      width: p.width,
      height: p.height,
      hung: p.hung,
      wallId: typeof p.wallId === 'string' ? p.wallId : undefined,
      orientation: p.orientation as Portrait['orientation'],
      narration: typeof p.narration === 'string' && narrations.has(p.narration) ? p.narration : undefined,
      imported: p.imported === true,
    }
  })
  return {
    version: 1,
    portraits,
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : '',
    settings: {
      theme: settings.theme as GalleryDocument['settings']['theme'],
      frame: settings.frame as GalleryDocument['settings']['frame'],
      sound: settings.sound,
      motion: settings.motion,
    },
  }
}

export class GalleryRepository {
  private database: Promise<IDBDatabase> | undefined
  private writes = Promise.resolve()

  async export(document = createDocument()) {
    const portraits = await Promise.all(document.portraits.map(async p => ({
      ...p,
      source: p.source instanceof Blob ? {
        mime: p.source.type,
        data: new Uint8Array(await p.source.arrayBuffer()).toBase64(),
      } : p.source,
    })))
    const stream = new Blob([
      JSON.stringify({
        ...document,
        portraits,
      }),
    ]).stream().pipeThrough(new CompressionStream('gzip'))
    return new Response(stream).blob()
  }

  async import(file: Blob) {
    if (file.size > maxBytes) {
      throw new Error('Choose a collection smaller than 150 mb.')
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
        if (total > maxBytes * 1.4) {
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
      if (typeof data !== 'string' || typeof mime !== 'string' || !imageTypes.has(mime)) {
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

  save(document: GalleryDocument) {
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
    return this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('slop-gallery', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('collections')
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close()
        resolve(request.result)
      }
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('Close the other gallery tabs to unlock storage.'))
    })
  }
}

export const repository = new GalleryRepository

export async function initializePersistence() {
  try {
    const saved = await repository.load()
    if (saved) {
      restoreDocument(saved)
    }
    useGallery.setState({saveStatus: 'saved'})
  } catch {
    useGallery.setState({saveStatus: 'error'})
    notify('Local storage could not be read. You can still explore and export your collection.')
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    const id = ++generation
    useGallery.setState({saveStatus: 'saving'})
    void repository.save(createDocument()).then(() => {
      if (id === generation && !timer) {
        useGallery.setState({saveStatus: 'saved'})
      }
    }).catch(() => {
      useGallery.setState({saveStatus: 'error'})
      notify('Local save failed. Export your collection from Settings to keep a backup.')
    })
  }
  const unsubscribe = useGallery.subscribe((s, previous) => {
    if (s.portraits === previous.portraits && s.theme === previous.theme && s.frame === previous.frame && s.sound === previous.sound && s.motion === previous.motion) {
      return
    }
    clearTimeout(timer)
    timer = setTimeout(flush, 400)
    useGallery.setState({saveStatus: 'saving'})
  })
  const hidden = () => {
    if (document.visibilityState === 'hidden' && timer) {
      flush()
    }
  }
  document.addEventListener('visibilitychange', hidden)
  return () => {
    unsubscribe()
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', hidden)
  }
}
