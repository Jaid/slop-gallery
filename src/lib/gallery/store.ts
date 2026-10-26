import type {GalleryDocument, GallerySettings, GallerySnapshot, NarrationState, Placement, Portrait, RoomId, Vec3} from './types.ts'

import {create} from 'zustand'

import {audioOverride} from '../audio/audioParameter.ts'
import {effectiveSeed, rollSeed} from '../environmentSeed.ts'
import {readControlled} from '../pauseMenu.ts'
import {localStore, sessionStore} from '../temporary.ts'
import defaultPortraits from './defaultPortraits.ts'
import {validateCollectionImages} from './imagePolicy.ts'
import {playerSession} from './PlayerSession.ts'

export {readControlled} from '../pauseMenu.ts'

export {maximumPortraits} from './imagePolicy.ts'
export type Panel = 'map' | null
type State = GallerySettings & GallerySnapshot & {
  active: string | null
  activeLabel: string | null
  add: (portrait: Portrait) => void
  ai: boolean
  apiKey: string
  /** replaces the collection; a new `seed` starts a new environment, like a new game */
  commit: (portraits: Array<Portrait>, seed?: number) => void
  dragging: boolean
  hasControlled: boolean
  held: string | null
  importEpoch: number
  importFiles: ((files: Array<File>, target?: {
    direction: Vec3
    origin: Vec3
  }) => Promise<void>) | null
  importTarget: ((x: number, y: number) => {
    direction: Vec3
    origin: Vec3
  }) | null
  inspecting: string | null
  locked: boolean
  /** Read-only projection for telemetry; the shared narrator owns playback and UI state. */
  narration: NarrationState | null
  notice: string
  panel: Panel
  placement: Placement | null
  playerEpoch: number
  ready: boolean
  remove: (id: string) => void
  resetEpoch: number
  revision: number
  room: RoomId
  saveStatus: 'error' | 'loading' | 'saved' | 'saving'
  storageRecoveryRequired: boolean
  update: (id: string, patch: Partial<Portrait>) => void
}

function cleanPortrait(p: Portrait): Portrait {
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
function snapshot(state: GallerySnapshot): GallerySnapshot {
  return {
    portraits: state.portraits.map(cleanPortrait),
    seed: state.seed,
  }
}
function readKey() {
  try {
    return sessionStore().getItem('slop-gallery-key') ?? ''
  } catch {
    return ''
  }
}
const initialSeed = rollSeed()
export const useGallery = create<State>((set, get) => ({
  portraits: defaultPortraits(initialSeed),
  seed: initialSeed,
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
  room: 'lobby',
  placement: null,
  playerEpoch: 0,
  ai: false,
  apiKey: readKey(),
  sound: audioOverride ?? false,
  narration: null,
  storageRecoveryRequired: false,
  saveStatus: 'loading',
  importEpoch: 0,
  revision: 0,
  importFiles: null,
  importTarget: null,
  update: (id, patch) => set(s => {
    const portraits = s.portraits.map(p => (p.id === id ? {
      ...p,
      ...patch,
    } : p))
    if (patch.source !== undefined) {
      validateCollectionImages(portraits)
    }
    return {portraits}
  }),
  commit: (portraits, seed) => {
    validateCollectionImages(portraits)
    set(s => ({
      portraits,
      seed: seed ?? s.seed,
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

// Entering the menu or acquiring pointer lock is not an in-game control.
export function markControlled() {
  const s = useGallery.getState()
  if (s.hasControlled || !s.locked || s.panel) {
    return
  }
  useGallery.setState({hasControlled: true})
  try {
    localStore().setItem('slop-gallery-controlled', 'true')
  } catch {
    // Control history still remains available for this visit when storage is blocked.
  }
}

/** The seed the environment of the current game state is built from, honoring the `?seed` override. */
export function useEnvironmentSeed() {
  return effectiveSeed(useGallery(s => s.seed))
}

export function createDocument(): GalleryDocument {
  const s = useGallery.getState()
  const savedAt = new Date
  return {
    ...snapshot(s),
    version: 1,
    savedAt: savedAt.toISOString(),
    player: playerSession.snapshot(),
    settings: {
      sound: s.sound,
    },
  }
}

export function restoreDocument(document: GalleryDocument) {
  validateCollectionImages(document.portraits)
  playerSession.restore(document.player)
  useGallery.setState({
    ...snapshot(document),
    sound: document.settings.sound,
    playerEpoch: useGallery.getState().playerEpoch + 1,
    active: null,
    activeLabel: null,
    held: null,
    placement: null,
    revision: useGallery.getState().revision + 1,
    importEpoch: useGallery.getState().importEpoch + 1,
  })
}
