import type SlopGalleryTelemetry from './SlopGalleryTelemetry.ts'

import {takeStaleChunkReload} from '../staleChunks.ts'

/** Log the reload for a stale chunk that led to this page, if any, as `gallery.chunk.stale_reload`, once: the report is gone after the first attachment. */
export default function recordStaleChunkReload(telemetry: SlopGalleryTelemetry, now = Date.now()) {
  const reload = takeStaleChunkReload()
  if (!reload) {
    return
  }
  telemetry.event('chunk.stale_reload', {
    'chunk.path': reload.chunk ?? 'unknown',
    'reload.delay_ms': Math.max(0, now - reload.at),
    ...reload.sessionId ? {'reload.previous_session_id': reload.sessionId} : {},
  }, `Reloaded for a stale chunk: ${reload.chunk ?? 'unknown'}`, 'warn')
}
