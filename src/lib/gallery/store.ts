import type {GalleryDocument, GallerySettings, GallerySnapshot, Placement, Portrait, RoomId, Vec3} from './types.ts'

import {create} from 'zustand'

import {initialPortraits} from './collection.ts'

export const maximumPortraits = 120
export type Panel = 'collection' | 'help' | 'map' | 'settings' | null
type State = GallerySettings & GallerySnapshot & {
  active: string | null
  add: (portrait: Portrait) => void
  ai: boolean
  apiKey: string
  commit: (portraits: Array<Portrait>) => void
  dragging: boolean
  future: Array<GallerySnapshot>
  held: string | null
  importFiles: ((files: Array<File>, target?: {direction: Vec3
    origin: Vec3}) => Promise<void>) | null
  inspecting: string | null
  locked: boolean
  narration: {id: string
    status: 'playing' | 'preparing'} | null
  notice: string
  panel: Panel
  past: Array<GallerySnapshot>
  placement: Placement | null
  ready: boolean
  remove: (id: string) => void
  importEpoch: number
  revision: number
  room: RoomId
  saveStatus: 'error' | 'loading' | 'saved' | 'saving'
  update: (id: string, patch: Partial<Portrait>) => void
}

export function cleanPortrait(p: Portrait): Portrait {
  return {
    ...p,
    pending: false,
    merging: false,
    reserved: false,
    velocity: undefined,
  }
}

function snapshot(state: GallerySnapshot): GallerySnapshot {
  return {
    portraits: state.portraits.map(cleanPortrait),
  }
}
function readKey() {
  try {
    return sessionStorage.getItem('slop-gallery-key') ?? ''
  } catch {
    return ''
  }
}

export const useGallery = create<State>((set, get) => ({
  portraits: initialPortraits.map(p => ({...p})),
  active: null,
  held: null,
  locked: false,
  ready: false,
  dragging: false,
  inspecting: null,
  notice: '',
  panel: null,
  room: 'daydream',
  placement: null,
  ai: false,
  apiKey: readKey(),
  sound: true,
  motion: typeof matchMedia === 'function' ? !matchMedia('(prefers-reduced-motion: reduce)').matches : true,
  theme: 'ivory',
  frame: 'gold',
  narration: null,
  saveStatus: 'loading',
  past: [],
  future: [],
  importEpoch: 0,
  revision: 0,
  importFiles: null,
  update: (id, patch) => set(s => ({portraits: s.portraits.map(p => p.id === id ? {...p, ...patch} : p)})),
  commit: portraits => set(s => ({
    portraits,
    past: [...s.past.slice(-19), snapshot(s)],
    future: [],
    revision: s.revision + 1,
    held: null,
    placement: null,
  })),
  add: portrait => {
    const s = get()
    if (s.portraits.length >= maximumPortraits) {
      throw new Error(`The gallery holds ${maximumPortraits} works. Remove a work before adding another.`)
    }
    s.commit([...s.portraits, portrait])
  },
  remove: id => get().commit(get().portraits.filter(p => p.id !== id)),
}))

export function undo() {
  const s = useGallery.getState()
  const previous = s.past.at(-1)
  if (!previous) {
    return false
  }
  useGallery.setState({
    ...snapshot(previous),
    past: s.past.slice(0, -1),
    future: [snapshot(s), ...s.future],
    held: null,
    active: null,
    placement: null,
    revision: s.revision + 1,
    importEpoch: s.importEpoch + 1,
  })
  return true
}

export function redo() {
  const s = useGallery.getState()
  const next = s.future[0]
  if (!next) {
    return false
  }
  useGallery.setState({
    ...snapshot(next),
    past: [...s.past, snapshot(s)],
    future: s.future.slice(1),
    held: null,
    active: null,
    placement: null,
    revision: s.revision + 1,
    importEpoch: s.importEpoch + 1,
  })
  return true
}

export function createDocument(): GalleryDocument {
  const s = useGallery.getState()
  return {
    ...snapshot(s),
    version: 1,
    savedAt: (new Date).toISOString(),
    settings: {
      theme: s.theme,
      frame: s.frame,
      sound: s.sound,
      motion: s.motion,
    },
  }
}

export function restoreDocument(document: GalleryDocument) {
  useGallery.setState({
    ...snapshot(document),
    ...document.settings,
    past: [],
    future: [],
    active: null,
    held: null,
    placement: null,
    revision: useGallery.getState().revision + 1,
    importEpoch: useGallery.getState().importEpoch + 1,
  })
}
