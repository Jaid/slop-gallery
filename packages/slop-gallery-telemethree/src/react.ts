import type {SlopGalleryTelemetry} from './SlopGalleryTelemetry.ts'
import type {GalleryStore} from './types.ts'

import {useEffect} from 'react'

export function useSlopGalleryTelemetry(telemetry: SlopGalleryTelemetry | null, store: GalleryStore, events?: EventTarget) {
  useEffect(() => {
    if (!telemetry) {
      return
    }
    const stop = telemetry.connect(store, events)
    const flush = () => {
      telemetry.flushInBackground()
    }
    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        flush()
      }
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', visibility)
      stop()
    }
  }, [telemetry, store, events])
}
