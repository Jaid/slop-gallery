import type {SlopGalleryTelemetry} from './SlopGalleryTelemetry.ts'
import type {GalleryStore} from './types.ts'

import {useEffect} from 'react'

export function useSlopGalleryTelemetry(telemetry: SlopGalleryTelemetry | null, store: GalleryStore, events?: EventTarget) {
  useEffect(() => {
    if (!telemetry) {
      return
    }
    let stop: (() => void) | undefined = telemetry.connect(store, events)
    const flush = () => {
      telemetry.flushInBackground()
    }
    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        flush()
      }
    }
    const pagehide = () => {
      stop?.()
      stop = undefined
      flush()
    }
    const pageshow = () => {
      stop ??= telemetry.connect(store, events)
    }
    window.addEventListener('pagehide', pagehide)
    window.addEventListener('pageshow', pageshow)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('pagehide', pagehide)
      window.removeEventListener('pageshow', pageshow)
      document.removeEventListener('visibilitychange', visibility)
      stop?.()
    }
  }, [telemetry, store, events])
}
