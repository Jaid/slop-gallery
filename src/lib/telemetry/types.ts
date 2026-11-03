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
  portraits: ReadonlyArray<{
    fusing?: boolean
    hung: boolean
    imported?: boolean
    pending?: boolean
  }>
  ready: boolean
  revision: number
  room: string
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
