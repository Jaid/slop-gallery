import type {Point3} from 'telemethree-ego'

import {SlopGalleryTelemetry} from './SlopGalleryTelemetry.ts'

const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)
const endpoint: string | undefined = import.meta.env.VITE_TELEMETRY_ENDPOINT
const enabled = params.get('telemetry') !== 'false' && params.get('test') !== 'true' && (import.meta.env.DEV || Boolean(endpoint))

export const telemetry = enabled ? new SlopGalleryTelemetry({
  endpoint,
  environment: import.meta.env.MODE,
}) : null

/** The controller owns this source; camera bob/inspection never masquerades as player movement. */
export const playerTelemetry: {read: (() => {position: Point3
  velocity: Point3} | null) | null} = {read: null}

if (import.meta.env.DEV) {
  import.meta.hot.dispose(() => {
    // eslint-disable-next-line promise/prefer-await-to-then -- HMR disposal is synchronous and telemetry must not block replacement.
    telemetry?.dispose().catch(() => {})
  })
}
