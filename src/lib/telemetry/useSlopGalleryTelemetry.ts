import type SlopGalleryTelemetry from './SlopGalleryTelemetry.ts'
import type {GalleryStore} from './types.ts'

import {useEffect} from 'react'

import recordPermalink from './recordPermalink.ts'

export default function useSlopGalleryTelemetry(telemetry: SlopGalleryTelemetry | null, store: GalleryStore, events?: EventTarget) {
  useEffect(() => {
    if (!telemetry) {
      return
    }
    // Every attachment starts a session span of its own, which the permalink it runs with belongs in.
    const connect = () => {
      const disconnect = telemetry.connect(store, events)
      recordPermalink(telemetry)
      return disconnect
    }
    let stop: (() => void) | undefined = connect()
    const pagehide = () => {
      // From pagehide on, BrowserVictoriaClient dispatches every admitted record right away, so the
      // session/gameplay spans and the detach log that closing the attachment produces still leave the page.
      stop?.()
      stop = undefined
    }
    const pageshow = () => {
      stop ??= connect()
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
