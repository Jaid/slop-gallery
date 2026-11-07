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
      // From pagehide on, BrowserVictoriaClient dispatches every admitted record right away, so the
      // session/gameplay spans and the detach log that closing the attachment produces still leave the page.
      stop?.()
      stop = undefined
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
