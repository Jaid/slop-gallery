import type SlopGalleryTelemetry from './SlopGalleryTelemetry.ts'
import type {GalleryStore} from './types.ts'

import {useEffect} from 'react'

export default function useSlopGalleryTelemetry(telemetry: SlopGalleryTelemetry | null, store: GalleryStore, events?: EventTarget) {
  useEffect(() => {
    if (!telemetry) {
      return
    }
    let stop: (() => void) | undefined = telemetry.connect(store, events)
    const pagehide = () => {
      stop?.()
      stop = undefined
      // BrowserVictoriaClient also flushes pagehide. This second pass admits the
      // session/gameplay spans that closing the gallery attachment just produced.
      // eslint-disable-next-line promise/prefer-await-to-then -- Page lifecycle callbacks cannot await delivery.
      void telemetry.flush().catch(() => {})
    }
    const pageshow = () => {
      stop ??= telemetry.connect(store, events)
    }
    window.addEventListener('pagehide', pagehide)
    window.addEventListener('pageshow', pageshow)
    return () => {
      window.removeEventListener('pagehide', pagehide)
      window.removeEventListener('pageshow', pageshow)
      stop?.()
    }
  }, [telemetry, store, events])
}
