import type {Point3} from 'telemethree-ego'

import SlopGalleryTelemetry from './SlopGalleryTelemetry.ts'

const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)
export const telemetry = params.get('telemetry') === 'true' ? new SlopGalleryTelemetry({
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

if (import.meta.env.DEV) {
  import.meta.hot.dispose(() => {
    // eslint-disable-next-line promise/prefer-await-to-then -- HMR disposal is synchronous and telemetry must not block replacement.
    telemetry?.shutdown().catch(() => {})
  })
}
