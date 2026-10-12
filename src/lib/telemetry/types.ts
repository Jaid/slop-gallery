import type {Attributes, VictoriaClientOptions} from 'victoria-browser-client'

/** Telemetry only needs selected gallery state, without artwork, keys or prompts. */
export type GalleryState = {
  ai: boolean
  held: string | null
  inspecting: string | null
  locked: boolean
  narration: {
    source: string | null
    status: string
  } | null
  panel: string | null
  portraits: ReadonlyArray<{
    hung: boolean
    imported?: boolean
    merging?: boolean
    pending?: boolean
  }>
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
export type SlopGalleryTelemetryOptions = Omit<VictoriaClientOptions, 'endpoint' | 'endpoints' | 'resource' | 'serviceName'> & {
  /** full ingestion URLs of VictoriaLogs JSON lines, VictoriaMetrics JSON import and VictoriaTraces OTLP JSON; a missing signal is not sent */
  endpoints?: Partial<Record<'logs' | 'metrics' | 'traces', string>>
  environment?: string
  resource?: Attributes
  sampleIntervalMs?: number
  sessionId?: string
  version?: string
}
