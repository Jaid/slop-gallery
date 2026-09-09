import type {GalleryDocument, GallerySettings, GallerySnapshot, NarrationState, Placement, Portrait, RoomId, Vec3} from './types.ts'

import {create} from 'zustand'

import {initialPortraits} from './collection.ts'
import {validateCollectionImages} from './imagePolicy.ts'

export {maximumPortraits} from './imagePolicy.ts'
export type Panel = 'collection' | 'help' | 'map' | 'settings' | null
type State = GallerySettings & GallerySnapshot & {
  active: string | null
  activeLabel: string | null
  add: (portrait: Portrait) => void
  ai: boolean
  apiKey: string
  commit: (portraits: Array<Portrait>) => void
  dragging: boolean
  future: Array<GallerySnapshot>
  hasControlled: boolean
  held: string | null
  importEpoch: number
  importFiles: ((files: Array<File>, target?: {direction: Vec3
    origin: Vec3}) => Promise<void>) | null
  importTarget: ((x: number, y: number) => {direction: Vec3
    origin: Vec3}) | null
  inspecting: string | null
  locked: boolean
  narration: NarrationState | null
  notice: string
  panel: Panel
  past: Array<GallerySnapshot>
  placement: Placement | null
  ready: boolean
  remove: (id: string) => void
  resetEpoch: number
  revision: number
  room: RoomId
  saveStatus: 'error' | 'loading' | 'saved' | 'saving'
  storageRecoveryRequired: boolean
  update: (id: string, patch: Partial<Portrait>) => void
}

export function cleanPortrait(p: Portrait): Portrait {
  return {
    ...p,
    pending: false,
    merging: false,
    reserved: false,
    velocity: undefined,
    mergeJob: undefined,
    flavorJob: undefined,
  }
}

export function readControlled() {
  try {
    return localStorage.getItem('slop-gallery-controlled') === 'true'
  } catch {
    return false
  }
}
// Entering the menu or acquiring pointer lock is not an in-game control.
export function markControlled() {
  const s = useGallery.getState()
  if (s.hasControlled || !s.locked || s.panel) {
    return
  }
  useGallery.setState({hasControlled: true})
  try {
    localStorage.setItem('slop-gallery-controlled', 'true')
  } catch {
    // Reset still becomes available for this visit when storage is blocked.
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
  activeLabel: null,
  held: null,
  locked: false,
  hasControlled: readControlled(),
  resetEpoch: 0,
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
  theme: 'ivory',
  frame: 'gold',
  narration: null,
  storageRecoveryRequired: false,
  saveStatus: 'loading',
  past: [],
  future: [],
  importEpoch: 0,
  revision: 0,
  importFiles: null,
  importTarget: null,
  update: (id, patch) => set(s => {
    const portraits = s.portraits.map(p => (p.id === id ? {...p, ...patch} : p))
    if (patch.source !== undefined) {
      validateCollectionImages(portraits)
    }
    return {portraits}
  }),
  commit: portraits => {
    validateCollectionImages(portraits)
    set(s => ({
      portraits,
      past: [...s.past.slice(-19), snapshot(s)],
      future: [],
      revision: s.revision + 1,
      held: null,
      placement: null,
    }))
  },
  add: portrait => {
    const s = get()
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
    activeLabel: null,
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
    activeLabel: null,
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
    },
  }
}

export function restoreDocument(document: GalleryDocument) {
  validateCollectionImages(document.portraits)
  useGallery.setState({
    ...snapshot(document),
    ...document.settings,
    past: [],
    future: [],
    active: null,
    activeLabel: null,
    held: null,
    placement: null,
    revision: useGallery.getState().revision + 1,
    importEpoch: useGallery.getState().importEpoch + 1,
  })
}
