import type {GallerySettings, GallerySnapshot, NarrationState, Placement, Portrait, Vec3} from './types.ts'

import {create} from 'zustand'

import world from '#src/worlds/current.ts'

import {audioOverride} from '../audio/audioParameter.ts'
import {readStored} from '../browserStorage.ts'
import {effectiveSeed} from '../environmentSeed.ts'
import {gameSeed} from '../gameSeed.ts'
import defaultPortraits from './defaultPortraits.ts'
import {validateCollectionImages} from './imagePolicy.ts'

export {maximumPortraits} from './imagePolicy.ts'
type State = GallerySettings & GallerySnapshot & {
  active: string | null
  activeLabel: string | null
  add: (portrait: Portrait) => void
  ai: boolean
  apiKey: string
  /** replaces the collection */
  commit: (portraits: Array<Portrait>) => void
  dragging: boolean
  hasControlled: boolean
  held: string | null
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
  placement: Placement | null
  ready: boolean
  remove: (id: string) => void
  revision: number
  /** the id of the room of the current world the player is in, or was in last when in a passage */
  room: string
  update: (id: string, patch: Partial<Portrait>) => void
}

export const useGallery = create<State>((set, get) => ({
  portraits: defaultPortraits(effectiveSeed(gameSeed)),
  seed: gameSeed,
  active: null,
  activeLabel: null,
  held: null,
  locked: false,
  hasControlled: false,
  ready: false,
  dragging: false,
  inspecting: null,
  notice: '',
  room: world.defaultRoom,
  placement: null,
  ai: false,
  apiKey: readStored('apiKey') ?? '',
  // An explicit ?audio wins over the player’s last switch.
  sound: audioOverride ?? readStored('audio') === 'true',
  narration: null,
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
  commit: portraits => {
    validateCollectionImages(portraits)
    set(s => ({
      portraits,
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
  if (s.hasControlled || !s.locked) {
    return
  }
  useGallery.setState({hasControlled: true})
}

/** The seed the environment of the current game state is built from, honoring the `?seed` override. */
export function useEnvironmentSeed() {
  return effectiveSeed(useGallery(s => s.seed))
}
