import type {TelemetryOptions} from 'telemethree'

/** Structural adapter: no imports from the app and no artwork, keys or prompts in the contract. */
export type GalleryState = {
  ai: boolean
  held: string | null
  inspecting: string | null
  locked: boolean
  narration: {source: string | null
    status: string} | null
  panel: string | null
  portraits: ReadonlyArray<{hung: boolean
    imported?: boolean
    merging?: boolean
    pending?: boolean}>
  ready: boolean
  resetEpoch: number
  revision: number
  room: string
  saveStatus: 'error' | 'loading' | 'saved' | 'saving'
  storageRecoveryRequired: boolean
}
export type GalleryStore = {
  getState: () => GalleryState
  subscribe: (listener: (state: GalleryState, previous: GalleryState) => void) => () => void
}
export type SlopGalleryTelemetryOptions = Partial<TelemetryOptions> & {
  /** A same-origin relay prefix by default, not a private network URL in the browser. */
  endpoint?: string
  environment?: string
  sampleIntervalMs?: number
  sessionId?: string
  version?: string
}
