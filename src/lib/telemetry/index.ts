import type {Point3} from 'telemethree-ego'

import ErrorTelemetry from 'victoria-browser-errors'

import {staleChunkReloads} from '../staleChunks.ts'
import SlopGalleryTelemetry from './SlopGalleryTelemetry.ts'
import {readTelemetry} from './telemetryParameter.ts'

const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)
export const telemetry = readTelemetry() ? new SlopGalleryTelemetry({
  endpoints: {
    logs: params.get('logs_ingestion_endpoint') ?? undefined,
    metrics: params.get('metrics_ingestion_endpoint') ?? undefined,
    traces: params.get('traces_ingestion_endpoint') ?? undefined,
  },
  environment: import.meta.env.MODE,
}) : null

/** The controller owns this source; camera bob/inspection never masquerades as player movement. */
export const playerTelemetry: {read: (() => {
  position: Point3
  velocity: Point3
} | null) | null} = {read: null}

// Connected as the client is made, so errors while the world still loads count too.
const errorTelemetry = telemetry && typeof window !== 'undefined' ? new ErrorTelemetry({
  telemetry,
  eventNamePrefix: 'gallery.',
  getContext: () => telemetry.getContext(),
}) : undefined
const disconnectErrors = errorTelemetry?.connect()
// A reload for a stale chunk names the session it ends, which the next page’s report links to.
staleChunkReloads.sessionId = telemetry?.sessionId
if (import.meta.env.DEV) {
  import.meta.hot.dispose(() => {
    disconnectErrors?.()
    telemetry?.shutdown().catch(() => {})
  })
}
